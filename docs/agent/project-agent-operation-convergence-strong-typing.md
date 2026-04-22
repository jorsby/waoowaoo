# Project Agent Operation 收敛与强类型化重构方案（Mode/Effects + Domain Groups）

## 摘要

目标：把当前“宽松 operation + 元信息分散 + facade operation 语义混杂”的结构，收敛成一套统一、强类型、可审计、可门禁的 Operation 主模型，并以 **domain/package 分组（groups）** 组织工具注入与 Prompt 呈现。

本次方案聚焦两件事：

1. **语义收敛**：一个 operation = 一个明确动作（避免 facade 内部二次路由）。
2. **强类型 + 门禁**：输入输出强约束、计划模式/风险/计费/破坏性操作有明确的执行门禁与确认流程。

并明确弃置/迁移：

- 弃置“工具配置 UI（让用户手动启用/禁用工具）”相关逻辑。
- 弃置“基于路由输出的类别列表 + 规则推导 + 打分排序 + 动态候选选择”的旧工具选择体系。

保留并加强：

- Always-on tool set：确认/选择/安全告知等 primitives 必须常驻，避免流程卡死。
- 显式失败与零隐式回退：缺字段/缺元信息/缺上下文必须失败，不允许静默兜底。

## 原则与硬约束

- 本仓库禁止 `any`。新增与重构不得引入任何 `any`。
- 禁止隐式兜底与静默回退：缺字段就失败、缺上下文就失败、缺确认就失败。
- route 只做鉴权、参数校验、提交任务与返回响应；复杂业务下沉到 `src/lib/**`。
- 高风险/计费/不可逆操作必须有显式确认 gate（未来可引入配额后允许 agent 在预算内自主执行，但也必须是显式策略）。

## 背景问题（需要被彻底消除）

### 1) Facade operation 语义混杂

典型表现：

- 诸如 `mutate_storyboard` 之类 operation 承载多个动作（删除、重排、更新提示词、批量更新等）。
- 需要模型在一个 tool 内再做二次路由与解释，导致选择不稳、参数不稳、失败率高。

目标：

- 拆分成多个原子 operation（一个 operation 对应一个动作 + 明确效果边界）。

### 2) “能不能执行”与“工具归属意图”混在一起

过去常见做法是把 plan/act/query 混作“权限判定”，导致：

- plan 模式下某些只读但计费的操作无法表达。
- plan 模式下是否允许执行，与操作归属（意图）耦合过深。

目标：

- 用 **intent(mode)** 表达“工具归属/用途”，用 **effects + confirmation** 表达“执行门禁/授权”。

## 目标架构（目标态）

### 核心对象：Operation Primary Model（短小精悍）

Operation 主模型以“函数签名 + 可判定语义”为中心，不再承载工具配置 UI 与打分选择器的元信息。

建议字段（概念结构，字段名可调整，但语义必须一致）：

- `id`：稳定标识（也作为 tool/function name；必须满足兼容性约束，建议 `snake_case`）。
- `summary`：命令式简述（给模型/日志/审阅用）。
- `intent`：`'query' | 'plan' | 'act'`（归属意图/用途，不是权限）。
- `groupPath`：`string[]`（domain/package 分组路径，用于注入与 Prompt 呈现；例如 `['workflow', 'plan']`）。
- `channels`：`{ tool: boolean; api: boolean }`（暴露面）。
- `prerequisites`：统一的上下文前置条件（例如 `episodeId required/optional/forbidden`；不要在每个 operation 上散落 `requiresEpisode`）。
- `effects`：可判定的副作用维度（替代 risk 档位）。
  - `writes`：会写入 DB / 状态变更
  - `billable`：会计费/消耗额度
  - `destructive`：不可逆/覆盖/删除
  - `bulk`：批量影响
  - `externalSideEffects`：外部系统副作用（生成/支付/调用第三方等）
- `confirmation`：确认策略（何时需要确认、确认摘要、确认参数协议）。
- `inputSchema` / `outputSchema`：强类型 + runtime 校验（zod）。
- `execute(ctx, input)`：实现函数。

关键点：

- **“是否允许执行”必须由执行入口统一强制检查**（而非仅依赖注入/选择器）。
- **plan 交互模式下允许 billable**：但必须通过确认 gate；是否允许 writes 可作为硬规则或显式策略（推荐硬规则：plan mode 禁止 `effects.writes`）。

### Intent（mode）与 Effects（执行门禁）的关系

- `intent` 用于表达“工具属于什么阶段”，便于组织注入与 Prompt。
- `effects` 用于表达“调用会发生什么”，便于执行门禁与确认。

例：

- `intent='plan'` 且 `effects.billable=true`：计划阶段也可能要做付费推理/分析；允许执行，但必须确认。
- `intent='query'` 且 `effects.billable=true`：只读但计费；允许执行，但必须确认/预算策略明确。

### Groups（domain/package 分组）与目录结构

本方案采用 **“领域/包”** 作为 groups 命名主轴（而非资源+动作混合命名），例如：

- `['ui']`
- `['workflow', 'plan']`
- `['storyboard', 'read']`
- `['storyboard', 'edit']`
- `['asset', 'character']`
- `['media']`
- `['billing']`

groups 的用途：

- **工具注入策略**：上层显式指定注入哪些 group（替代旧的“类别推导 + 规则”注入方式）。
- **Prompt 呈现**：把可用 tools 按 group 分段注入，降低模型困惑。

#### groups 的“双来源一致性”要求（内部参数 + 文件夹）

期望：groups 分为两部分来源：

1. **内部显式定义的 groupPath**（用于运行时注入与 Prompt）。
2. **文件所在子目录的 folderGroup**（用于代码组织与人类定位）。

原则：二者必须一致；不一致必须失败（测试/guard）。

推荐实现方式（显式 + 可测试，禁止隐式从文件路径推导）：

- 每个 domain 子目录定义 `FOLDER_GROUP` 常量（例如 `['workflow', 'plan']`）。
- 该目录的 `index.ts`/pack 构造器通过 helper 给所有 operation 注入 `groupPath=FOLDER_GROUP`（或以其为前缀）。
- 单测/guard 遍历 registry，断言每个 operation 的 `groupPath` 与其所属 pack 声明一致。

这样目录移动会强制同步更新 `FOLDER_GROUP`，避免“重构目录导致语义漂移”的隐式风险。

## 代码组织（Step 1.5：先按域分目录）

先按 domain/package 聚合，不强制“一 operation 一文件”，避免样板爆炸与高 churn。

建议目录形态（示意）：

```
src/lib/operations/
  registry.ts                 # 对外稳定入口
  project-agent.ts            # registry 组装（避免堆业务）
  confirmation.ts             # 统一确认协议（如已存在则复用）
  ui/
    always-on-ops.ts          # ui_confirm/ui_single_select/...（always-on）
  workflow/
    plan-ops.ts
  storyboard/
    read-ops.ts
    edit-ops.ts
  asset/
    character-ops.ts
    location-ops.ts
  media/
    media-ops.ts
    video-ops.ts
    download-ops.ts
  billing/
    billing-ops.ts
  api-only/
    ...
```

说明：

- folderGroup 与 groupPath 命名保持一致（领域/包主轴）。
- `project-agent.ts` 只负责拼装与 defaults 注入，复杂业务必须下沉 `src/lib/**`。

## 工具注入与执行门禁（替代旧选择器/类别体系）

### 注入策略（Injection Policy）

不再使用“类别 -> 规则 -> tags/scopes -> score”的旧选择器。

改为：上层显式指定要注入的 group（领域/包），再加 always-on。

概念：

- `alwaysOnGroups`: `['ui']`（或固定 always-on operation id 集合）
- `requestedGroups`: 由上层决策直接给出（例如当前 workflow 场景：`['workflow', 'plan']`、`['storyboard', 'edit']`）
- 注入集合 = always-on + requestedGroups 对应的 operations

注：上层“如何决定 requestedGroups”不在本方案强制范围内；可以是显式 UI 场景、显式工作流步骤、或后续再引入最小规则。

### 执行门禁（Execution Gate，必须在执行入口强制）

核心规则（建议作为硬规则写入执行入口，避免绕过）：

1. **上下文前置条件**：缺 prerequisite 直接失败（或拒绝执行并提示缺少上下文）。
2. **plan 交互模式**：
   - 禁止 `effects.writes === true` 的 operation 执行（推荐硬规则）。
   - 允许 `effects.billable === true` 的 operation 执行，但必须确认 gate。
3. **确认 gate**：
   - `effects.destructive/billable/externalSideEffects/bulk/overwrite` 等触发确认。
   - 未确认（例如缺 `confirmed=true`）则拒绝执行并输出 confirmation request part。

## Always-on Tool Set

always-on 目的：保证基础交互 primitives 永远可用，避免流程卡死。

建议集合（示意）：

- `ui_confirm`
- `ui_cancel`
- `ui_single_select`
- `ui_multi_select`
- `ui_safety_ack`

原则：

- always-on 不依赖分组注入策略（永远注入）。
- always-on 本身必须是低副作用（通常 `effects.writes=false` 且 `billable=false`）。

## 收敛策略（迁移步骤）

### Step 0：盘点与冻结范围

- 输出 operation 清单（id、输入输出 schema、effects、prerequisites、groupPath）。
- 标记 facade operation（例如 storyboard mutation 类）。

### Step 1：落地 Operation 主模型（intent + effects + prerequisites + groupPath）

目标：让 registry 成为唯一 truth source，并且具备执行门禁所需的最小可判定语义。

要求：

- input/output schema 强约束；禁止 `any`。
- effects/prerequisites/confirmation 必须显式可判定，不允许隐式猜测。

### Step 1.5：目录结构按域收敛 + folderGroup 一致性校验

- 文件迁移到 domain 子目录。
- 每个 domain pack 声明 `FOLDER_GROUP`，通过 helper 注入 `groupPath`。
- 增加测试：folderGroup 与 operation.groupPath 不一致即失败。

### Step 2：拆解 facade operation

- 一个 operation = 一个动作 + 明确效果边界。
- 删除/覆盖/不可逆修改必须显式 confirmation gate。

### Step 3：移除旧选择器/类别体系，改为 group-based 注入

- 移除旧的“类别推导 + tags/scopes/score”选择器与相关数据结构。
- 引入显式 `requestedGroups`（或等价结构）作为注入输入。
- Prompt 按 groupPath 分段注入工具说明。

### Step 4：测试与导出

- 单测覆盖：
  - always-on 常驻
  - plan 交互模式禁写 + 付费需确认
  - prerequisites 缺失显式失败
  - folderGroup/groupPath 一致性
- 导出全局 registry snapshot 到 `docs/agent/artifacts/**` 供审阅。

## 执行计划（M0/M1…）

为降低 churn，按里程碑推进（每个里程碑都必须可测试/可回滚）：

- **M0：对齐新设计与迁移边界**
  - 文档与命名规范对齐（`id` 统一 `snake_case`；groups 为 domain/package）
  - 明确弃置：工具配置 UI、旧选择器/类别打分体系
- **M1：Always-on 常驻 + 执行入口门禁**
  - always-on primitives 常驻
  - 执行入口强制：confirmation gate、plan 禁写、billable 需确认、prerequisites 缺失失败
- **M2：Operation 主模型落地（intent/effects/prerequisites/groupPath）**
  - registry 成为 truth source
  - 统一导出 snapshot（供审阅）
- **M3：Group-based 注入替代旧选择器/类别体系**
  - 注入输入改为显式 requestedGroups
  - Prompt 按 groupPath 分段呈现
  - 注入输入改为显式 requestedGroups
  - Prompt 按 groupPath 分段呈现
- **M4：Step 1.5 目录收敛**
  - operations 文件迁移到 domain 目录
  - folderGroup/groupPath 一致性测试落地
- **M5：Facade 拆解**
  - 拆 `mutate_storyboard` 等 facade
- **M6：远期评估“单 operation 单文件”**
  - 满足评估标准再做，避免机械拆分

## 交付物

### 1) 代码与测试

- Operation 主模型与 registry（truth source）
- always-on primitives
- 执行入口门禁（plan 禁写、确认 gate、prerequisites）
- group-based 注入与 Prompt 分组
- 拆解 facade operation 的实现与测试

### 2) 全局 registry 导出（用于人工审阅）

建议路径：

- `docs/agent/artifacts/operation-registry.export.json`

导出结构建议包含：

- `id` / `summary`
- `intent`
- `groupPath`
- `prerequisites`
- `effects`
- `confirmation`（如果存在）
- `channels`
- `input/output` jsonSchema（可选 example）
- `alwaysOnOperationIds`

导出要求：

- 内容来自真实 registry，不允许手写伪造。
- schema 不允许 `any` 语义；对无法表达/无法导出的 schema 必须在构建/测试时失败（显式失败）。

## 验收口径

- always-on primitives 永远可用。
- 执行入口门禁可靠：
  - plan 交互模式禁止写入类 operation
  - 计费/破坏性/外部副作用必须确认后才能执行
  - prerequisites 缺失显式失败
- 旧的“类别 + 规则 + 打分”工具选择体系被移除，注入改为显式 group-based。
- 旧的“类别 + 规则 + 打分”工具选择体系被移除，注入改为显式 group-based。
- `src/lib/operations/` 目录按 domain 可定位；folderGroup 与 groupPath 一致性可测试。
