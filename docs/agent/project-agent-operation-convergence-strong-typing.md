# Project Agent Operation 收敛与强类型化重构方案

## 摘要

目标是把当前“宽松 operation + 混杂 tool 元信息 + facade/显式能力混用”的结构，收敛成一套统一的、强类型的 operation 主模型。

本方案同时解决两类问题：

1. 语义问题
   - operation 粒度过粗，模型难以稳定选择和调用
   - tool 元信息来源不统一，catalog / selector / API 对能力的理解不一致
2. 类型问题
   - 不少 operation 输入输出实际上是 unknown / 宽松对象 / 类 any 语义
   - 参数角色、目标对象、效果边界没有结构化表达，导致测试和适配层只能猜

最终目标是：

- operation registry 成为唯一 truth source
- tool catalog / tool selector / tool adapter 全部从同一套 descriptor 派生
- operation 的输入输出可被类型系统与测试严格约束
- 引入 always-on tool set，确保基础交互与安全门禁不依赖“候选打分”机制

## 原则与硬约束

- 本仓库禁止 `any`。新增与重构不得引入任何 `any`。
- 禁止隐式兜底与静默回退：缺元信息就失败，缺字段就失败，选择器不做“猜测补全”。
- route 只做鉴权、参数校验、提交任务与返回响应；复杂业务下沉到 `src/lib/**`。
- 高风险操作（删除/覆盖/不可逆修改）必须有显式确认 gate。

## 当前问题归因（需要被彻底消除）

### 1) Operation 粒度与语义混杂

典型表现：

- `mutate_storyboard` 这类 operation 同时包含多个动作（删除、重排、更新提示词、批量更新等）。
- UI/selector 很难稳定判断“用户当前想做哪一种动作”，导致工具选择不稳、调用参数不稳、失败率增高。

本质原因：

- operation 不是“一个动作”，而是“一个 mutation facade”，模型需要在一个 tool 内再做二次路由与解释。

### 2) Tool 元信息来源混乱

现状倾向于：

- registry 里大量 operation 依赖 pack 级默认元信息兜底
- 少数手写 operation 的元信息不充分（描述、风险、参数定义不完整）
- 选择器是“纯候选打分”，缺少基础工具常驻层

本质结果：

- catalog、selector、API adapter 各自对 tool 能力的理解不一致，测试也很难覆盖稳定行为。

### 3) 类型系统形同虚设

典型表现：

- operation 的 input/output 在 TS 层面是 unknown / 宽松对象
- adapter 与测试只能靠“猜字段”与运行时断言兜底

本质原因：

- operation 没有像函数声明一样：输入参数、效果边界、返回结构都被强类型与 runtime 校验严格约束。

## 目标架构（目标态）

### 核心对象：Operation Primary Model

建立单一的 operation 主模型（以下简称 OperationModel），它同时承载：

- 语义：一个 operation 对应一个用户可感知的动作
- 安全：风险级别、确认策略、幂等语义（如适用）
- 类型：输入/输出结构（强类型 + runtime 校验）
- 适配：映射到 tool 的 descriptor（同源派生）

所有 tool 元信息必须从 OperationModel 派生，禁止出现“descriptor 作为另一套并行模型”的情况。

### Descriptor 的定位

descriptor 是 operation 的“可暴露给 LLM/UI 的视图”，但它不是第二套真相源。

要求：

- descriptor 是可生成的派生物
- operation 的核心语义与类型约束必须先在 OperationModel 定义清楚

换句话说：

- descriptor 可以作为 OperationModel 的一个字段或派生函数结果
- 但 descriptor 不能替代 OperationModel 的输入/输出类型契约

### Always-on Tool Set

定义一组“基础常驻工具”，不参与候选打分、不随 pack/phase 隐式消失，用于：

- 显式确认（confirm / cancel / acknowledge）
- 单选、多选与结构化选择（single_select / multi_select）
- 需要时的解释型工具（如 show_help / explain_plan），但必须保持最小集合

always-on 的目的：

- 防止纯打分选择器在关键交互中漏掉必要工具，导致流程卡死
- 把“交互 primitives”与“业务动作 operation”分离，避免每个业务工具都内置确认逻辑

## 收敛策略（如何从现状迁移）

### Step 0: 盘点与冻结范围

输出一份现状清单：

- operation registry 中的所有 operation id
- 每个 operation 当前的输入/输出形态与元信息来源（pack default 或手写）
- 哪些 operation 属于 facade（混合多个语义动作）

注意本次重构的范围是 operation 模型与相关适配层，目标是把所有存在问题的 operation 都纳入重构计划，不要求一次性完成所有 operation 的重构，但是要多轮迭代推进，并恰当记录commit,最后交付结果是达成全覆盖。

### Step 1: 定义 OperationModel（强类型 + runtime 校验）

为 OperationModel 定义统一结构（建议在 `src/lib/operations/**` 或 `src/lib/project-agent/**` 中建立单一入口），至少包含：

- `id`: string literal union（或通过注册表导出 union）
- `summary`: 简短、命令式语义
- `risk`: 明确风险分级与是否需要确认
- `scopes`: 影响对象域（project/episode/clip/storyboard/panel/asset 等）
- `input`: 强类型输入 schema（含 runtime 校验）
- `output`: 强类型输出 schema（含 runtime 校验）
- `descriptor`: tool 视图（可从上述字段派生）
- `execute`: 具体执行函数

强制要求：

- input/output 不能出现 loose object；禁止 `Record<string, unknown>` 作为“万能入参”
- 对象定位必须结构化：例如 storyboard 的 panel 应使用明确标识（panelId 或稳定 index 语义），禁止“第几个分镜”这种自然语言入参

### Step 2: 拆解 facade operation（以 mutate_storyboard 为代表）

把单个 facade operation 拆为多个显式 operation：

示例（仅示意，最终以代码与域模型为准）：

- `storyboard.panel.delete`
- `storyboard.panel.update_prompt`
- `storyboard.panel.regenerate_image`
- `storyboard.panel.reorder`

拆解规则：

- 一个 operation = 一个明确动作 + 明确效果边界
- 每个 operation 的风险与确认策略独立定义（删除/覆盖必须确认）
- operation 的输入输出必须与 action 对齐（避免“大而全”的 payload）

### Step 3: 统一 tool 元信息生成与注册逻辑

建立单一导出路径：

- tool catalog 仅从 OperationModel 列表派生
- selector 的候选集来自：always-on tool set +（按 phase/policy 裁剪后的 operations）

禁止：

- pack default metadata 对手写 operation 进行“补齐兜底”
- selector 对 metadata 缺失进行猜测修复

### Step 4: 引入 Always-on Tool Set，并落到 selector

要求 selector 具备两层：

- base layer: always-on tools（确认/选择等 primitives）
- candidate layer: 当前上下文可见 operations（基于 policy/phase/risk 过滤）

### Step 5: 收紧类型并补齐测试

对每个被触达的 operation：

- 用 TS 类型与 runtime schema 双重约束输入输出
- 写最小必要测试，至少覆盖：
  - registry 导出是否包含预期的 descriptor 与 schema 元信息
  - selector 是否始终包含 always-on 工具
  - 拆分后的 operation 是否可被稳定选择（contract/route 层按需）

## 交付物（本方案完成后必须产出）

### 1) 代码与测试

- 新的 OperationModel 定义与注册表
- facade operation 的拆解与调用方适配
- selector 的 always-on layer
- 补齐的 contract/integration/unit/regression 测试

### 2) 全局 Operation 结构化导出 JSON（用于人工审阅）

在重构完成后，必须把最终的全局 operation registry 结构化导出并写入仓库，供审阅。

建议路径：

- `docs/agent/artifacts/operation-registry.export.json`

导出文件必须包含以下信息（示意结构，不要求字段名完全一致，但语义必须完备）：

```json
{
  "generatedAt": "2026-04-21T00:00:00.000Z",
  "schemaVersion": 1,
  "operations": [
    {
      "id": "storyboard.panel.delete",
      "summary": "Delete a storyboard panel",
      "risk": { "level": "high", "requiresConfirmation": true },
      "scopes": ["project", "episode", "storyboard", "panel"],
      "input": { "jsonSchema": {}, "example": {} },
      "output": { "jsonSchema": {}, "example": {} },
      "descriptor": {
        "toolName": "storyboard.panel.delete",
        "uiLabelKey": "tool.storyboard.panel.delete",
        "descriptionKey": "tool.storyboard.panel.delete.desc"
      }
    }
  ],
  "alwaysOnTools": [
    { "id": "ui.confirm" },
    { "id": "ui.single_select" }
  ]
}
```

导出要求：

- 内容来自真实 registry，不允许手写伪造
- 所有 operation 必须无 `any`/unknown 语义的 schema 表达
- 如果某 operation 无法导出 schema，必须在构建/测试时失败

## 验收口径

- tool catalog 与 selector 的来源统一，且 selector 永远包含 always-on 工具。
- operation 拆解后，模型选择稳定性提升：
  - tool 只显示成功/失败时仍可折叠查看详情（UI 层）
  - operation 的参数更像“函数签名”，不再依赖自然语言猜测
- 类型与测试能提前阻止“缺字段/字段语义变化/元信息缺失”的线上问题。

