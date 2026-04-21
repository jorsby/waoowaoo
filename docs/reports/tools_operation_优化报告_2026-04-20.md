# Tools 与 Operation 现状及优化报告

更新时间：2026-04-20

## 1. 报告结论（摘要）

当前系统的核心问题不是“能力不足”，而是“能力暴露过宽、缺少动态治理”。

- Tools 规模已较大：工具侧 registry 161，API-only operation 28。
- Runtime 当前为全量暴露：会话中直接把 registry 全部映射为 tools，未按 phase、风险、上下文裁剪。
- sideEffects 风险元数据已具备基础能力（如 requiresConfirmation），但 operation 缺少 visibility 维度，导致无法无硬编码做动态选择。
- 在不减少能力的前提下，应改造为“全能力注册 + 会话动态暴露 + 前端可配置启用（支持声明式 profile + 显式勾选工具）”。

结论：tools 偏多是事实，但不建议删能力；应通过动态可见性和策略选择实现“能力不变、噪音下降、行为可控”。

---

## 2. 当前实现事实（代码口径）

### 2.1 架构与链路

- Project Agent Tool 调用入口：`src/lib/project-agent/runtime.ts` 将 operation registry 映射为 tools，然后通过 tool adapter 执行（执行适配器：`src/lib/adapters/tools/execute-project-agent-operation.ts`）。
- Project Agent API 调用入口：API adapter 使用 API 专用 registry（含 api-only operations）。
- Registry 分层：已具备工具侧与 API 侧分流机制。
- 高风险执行门控：tool adapter 已对 `requiresConfirmation` / `billable` / `risk>=medium` 等操作强制 `confirmed=true` gate（即使未来前端启用工具，也不能绕过确认）。
  - 备注：仓库中还存在 `Assistant Platform`（`src/lib/assistant-platform/**`）的 skill 工具体系；本报告优先聚焦 Project Agent 的 operation→tools 链路，后续可复用同一套“catalog + selection + policy”的治理方式。
- Tool Catalog（工具目录）API：`GET /api/projects/:projectId/assistant/tool-catalog`（后端生成“可配置工具清单”，供前端渲染配置 UI）。

### 2.2 数据指标（本次扫描）

- 工具侧 operation 数：161（来源：/tmp/tool_operation_ids.txt）
- API-only operation 数：28（来源：/tmp/api_only_operation_ids.txt）
- requiresConfirmation=true：67
- outputSchema 为 z.unknown()：174

说明：outputSchema 宽松比例偏高，会影响契约清晰度、测试断言质量和回归可诊断性。

### 2.3 工具暴露现状（关键事实）

- **当前为“全量 tools 注入”**：`src/lib/project-agent/runtime.ts` 中 `Object.entries(operations).map(...)` 直接构建全部 tools（无筛选、无上限、无策略层）。
- **operation 元数据目前不足以驱动动态治理**：`src/lib/operations/types.ts` 有 `sideEffects` 与 `scope`，但没有 “tool visibility / 分组 / pack / 可用户配置”等元数据。
- **API-only 已隔离但仍缺 tool 层治理**：`src/lib/operations/registry.ts` 的 `createProjectAgentOperationRegistryForApi` 合并 api-only 并做冲突校验，但 tool 侧仍把 tool registry 全量暴露。

### 2.4 关键实现观察

1. Runtime 全量映射 tools（无动态筛选）
   - 文件：src/lib/project-agent/runtime.ts
   - 表现：Object.entries(operations).map(...) 直接构建全部 tools。

2. Operation 元数据已包含 sideEffects/scope，但缺 visibility
   - 文件：src/lib/operations/types.ts
   - 表现：当前可用于风险分流，尚不能用于“是否在当前会话可见”。

3. Registry 已支持 API-only 合并
   - 文件：src/lib/operations/registry.ts
   - 表现：createProjectAgentOperationRegistryForApi 会合并 api-only 并做冲突校验。

4. 前端与路由已具备 context 透传能力
   - 文件：src/components/assistant/useAssistantChat.ts
   - 文件：src/app/api/projects/[projectId]/assistant/chat/route.ts
   - 表现：可直接承载“前端工具启用配置”的参数（profile/toolSelection/toolSelectionKey 等）。

---

## 3. 问题诊断

### 3.1 为什么会感觉 tools 太多

- 模型在每轮决策面对过大的工具集合，语义检索负担增加。
- 低相关工具与高风险工具同时暴露，增加误调用概率。
- 工具描述与 schema 宽松项过多时，调用试错成本上升。

### 3.2 当前治理短板

- 缺“会话级可见性策略层”：没有动态裁剪器。
- 缺“前端声明式启用协议”：无法优雅表达当前任务偏好。
- 缺“无硬编码的可见性元数据”：只能靠 operationId 或目录习惯做特判。

### 3.3 直接删 tools 的风险

- 会导致能力退化和隐藏回归。
- 会让 API 与 Tool 语义边界再次分叉。
- 不符合“统一真相源 + 能力不变”的长期方向。

---

## 4. 优化目标（能力不变）

1. 不减少 operation 能力覆盖。
2. 引入动态 visibility，避免基于 operationId 的硬编码分支。
3. 支持前端“可配置启用”（配置 UI 勾选）但保持后端策略可控与安全兜底（server final decision + confirmed gate）。
4. 让模型在每轮只看到“当前最相关工具集”。

---

## 5. 方案设计

## 5.1 元数据扩展：为 operation 增加 visibility（核心）

在 ProjectAgentOperationDefinition 增加可组合元数据，例如：

- channels:
  - tool: boolean
  - api: boolean
- tool:
  - selectable: boolean（是否允许被“前端工具配置 UI”勾选；默认 false，避免把内部/危险工具直接暴露为可选项）
  - defaultVisibility: hidden | core | scenario | extended | guarded
  - groups: string[]（用于 UI 树形分组路径，例如 `['workflow','plan']` / `['asset-hub','read']`）
  - tags: string[]（如 workflow/media/asset-hub/governance）
  - phases: string[]（允许出现的项目阶段）
  - requiresEpisode: boolean（无 episodeId 则强制隐藏）
  - allowInPlanMode: boolean
  - allowInActMode: boolean
- selection:
  - baseWeight: number（排序权重）
  - costHint: low | medium | high

设计原则：
- `defaultVisibility` 的语义是：在“无前端配置”的情况下，tool 默认属于哪一层（core/scenario/extended/guarded/hidden）。
- 不在 runtime 写 operationId 特判。
- “元数据缺省值”必须可推导、可测试：优先在 `createXOperations()` 聚合层按模块打 pack/tag/group，避免要求 161 个 operation 全部手写补齐。

## 5.2 新增策略执行器：会话动态选取（无硬编码）

新增模块：tool-visibility-policy（命名可调整）

输入：
- operation 元数据（scope/sideEffects/channels/tool/selection）
- 会话上下文（phase、episodeId、currentStage）
- 前端声明式偏好（见 5.3）
- 服务器特性开关（可选）

输出：
- enabledTools（可见且可调用）
- gatedTools（可见但需确认）
- hiddenReasons（隐藏原因，用于调试与观测）

建议规则：
- channel 不含 tool => 隐藏
- phase 不匹配 => 隐藏
- requiresEpisode=true 且无 episodeId => 隐藏
- destructive/overwrite/bulk/longRunning 且未确认 => 可见但 gated
- 按 baseWeight + 上下文命中分排序，只注入 Top N 默认工具，并支持按需扩展（即使用户勾选很多工具，也不会把全部塞进 prompt）

### 5.2.1 Router：用户输入如何映射到“节点/工具包”

疑问点：用户输入一段 prompt，到底应走哪个节点？尤其是“处于分镜编辑阶段，但用户提问角色人设”这类跨域请求。

结论：**不要把 `currentStage/phase` 当成硬路由**。阶段应作为 prior（加权因素），最终以“用户意图 + 所需副作用 + 依赖的 scope/artifact”决定节点与工具包。

建议采用“两段式路由”：

1) **Triage（意图归一化）**：把自然语言输入归一化为结构化意图（可用规则 + LLM 分类，但必须可测、可解释）：
   - intent: query | act | plan
   - domains: string[]（如 storyboard / character / asset-hub / workflow / config / governance）
   - targetRefs: { episodeId?; storyboardId?; panelId?; characterId? }（如果能从上下文解析出来）
   - risk: none | low | medium | high（用于决定是否允许进入 act 子图/是否需要确认）
   - confidence: number（低置信度必须问澄清问题或回到只读节点）

2) **Route（节点选择 + 工具包选择）**：根据 triage 输出与上下文（phase/currentStage/episodeId/activeRuns）做打分路由：
   - 节点是“职责边界”，每个节点只绑定少量工具包（避免全量 tools）
   - phase/currentStage 只影响打分，不做强制绑定

建议的细粒度节点（可按需要继续拆分，但保持职责单一）：

- `project_overview`：项目状态/进度/上下文（只读为主）
- `workflow_plan`：工作流规划/审批（plan 模式为主）
- `workflow_run`：run 生命周期管理（创建/取消/重试/事件）
- `task_manage`：task 生命周期管理（查询/取消/重试）
- `storyboard_read`：分镜/镜头/面板只读查询（不改写）
- `storyboard_edit`：分镜结构与文案编辑（改写但低风险）
- `panel_media_generate`：面板级媒体生成/重生成（计费/长耗时，强 confirmed gate）
- `project_assets_read`：项目角色/场景/道具读取（只读为主）
- `project_assets_edit`：项目角色/场景/道具编辑（改写但低风险）
- `asset_hub_read`：全局资产库读取/选择器（默认只读，不开放全局写入）
- `config_models`：模型/偏好/API 配置（system scope）
- `billing_costs`：费用/额度/账单查询（只读为主）
- `governance_recovery`：回滚/治理/批处理恢复（高风险，guarded）
- `downloads_exports`：下载/导出（可能长耗时）
- `debug_tools`：仅开发/诊断用途（默认 hidden）

实现落点建议（对应当前仓库）：

- Router：`src/lib/project-agent/router.ts`（triage + node 决策，输出 reasonCodes/confidence）
- Policy：`src/lib/project-agent/tool-policy.ts`（根据 node + phase + toolSelection 选 Top-N tools）
- Runtime 接入：`src/lib/project-agent/runtime.ts`（每轮仅注入 policy 选出的 tools）

处理“分镜阶段问角色人设”的推荐行为：

- 若 intent=query（例如“这个角色的人设是什么/给我一个设定建议”）：路由到 `character_persona` / `asset-hub-read` 类只读节点（不需要 storyboard 编辑工具）。
- 若 intent=act 且目标是“把人设写入当前分镜/镜头描述”（例如“把角色A设定应用到第 12 镜并改文案”）：路由为多步：
  1) `character_persona` 节点读取/生成设定（低风险可 query/plan）
  2) `storyboard_edit` 节点执行编辑（act，可能需要 confirmed gate 或审批）

多意图输入的处理原则：

- 先拆解：一个输入可能同时包含“查询 + 修改 + 提交任务”，router 应把它拆为 plan 或分步执行，而不是把所有工具一次性注入。
- 不确定时默认走“只读 + 追问”：例如先问用户“你是想查询人设，还是要把人设应用到当前分镜并改动内容？”；禁止隐式猜测导致写入。

观测与调试建议：

- router 输出应附带 `reasonCodes`（命中关键词/命中文档/命中阶段 prior 等）与 `confidence`，并可在 debug 面板查看。
- 增加回放评估：统计 mis-route（用户纠正次数、工具调用失败率）来迭代路由规则。

## 5.3 前端可配置启用（UI）：支持“声明式 profile + 显式勾选工具”

目标：既能满足“像配置工具面板那样逐个勾选工具”的产品诉求，又不把“工具列表”硬编码在前端代码里，仍保持后端为最终裁决者。

核心拆分为三件事：

1) **Tool Catalog（工具目录）**：由后端提供，前端用于渲染配置 UI  
2) **Tool Selection（用户选择）**：由前端产生并持久化（localStorage 或 server），随请求透传或引用配置 key  
3) **Tool Policy（最终裁决）**：后端合并（phase/context + server 默认 + selection）计算“每轮注入 tools”

### 5.3.1 Tool Catalog：后端提供的“可配置工具清单”

新增 API（建议，命名可调整）：

- `GET /api/projects/:projectId/assistant/tool-catalog`
  - 返回当前用户在该项目下“可被勾选”的工具项（过滤掉 api-only / 内部工具 / 禁止配置项）
  - 字段建议包含：`operationId`、`description`、`groups/tags`、`sideEffects`（用于 UI 显示风险徽标）、`defaultVisibility`、`selectable`

原则：

- Tool Catalog 不等于“当前会话注入的 tools”：Catalog 用于配置 UI；Policy 决定每轮注入的子集。
- 前端不维护写死的 operationId 列表：所有选项来自 Catalog。
- Catalog 需要稳定、可测试：同一版本下必须确定性排序与分组。

### 5.3.2 Tool Selection：前端传入/持久化的选择协议

建议在 chat 请求 `context` 中新增 `toolSelection`（仅表达意图，后端最终裁决）：

- profile（可选，声明式偏好）：
  - mode: explore | edit | generate | recover
  - packs: string[]（workflow/media/asset-hub/governance）
  - riskBudget: low-only | allow-medium | allow-high-with-confirm
  - optionalTags: string[]
- overrides（可选，显式勾选结果）：
  - enabledOperationIds: string[]（来自 catalog 勾选结果）
  - disabledOperationIds: string[]
  - pinnedOperationIds: string[]（少量“固定注入”；需后端限制数量上限）

关键约束（必须写入校验与测试）：

- **server final decision**：前端勾选不等于必然可用；后端可基于 role、phase、scope、风险等拒绝或降级到 hidden/guarded。
- **不允许绕过 confirmed gate**：无论 selection 如何，执行路径仍由 tool adapter 强制确认。
- **避免“无限 tools 注入”**：即使 enabledOperationIds 很多，runtime 仍按策略层每轮 Top N 注入；pinned 也必须有数量上限。

持久化建议（两种路径，按阶段落地）：

- P1（最快可交付）：前端 `localStorage` 持久化 selection，并随 chat 请求 context 透传
- P2（多端一致）：服务端落库（例如 userPreference JSON 字段），通过 `toolSelectionKey` 引用；前端只传 key，不传大 payload

### 5.3.3 前端交互（配置面板）

UI 行为建议：

- 树形分组：按 `groups` 渲染（如 workflow / asset-hub / governance / debug）
- 工具项展示：operationId + description + 风险/计费/确认徽标
- 支持搜索、全选/清空、显示“已选 N 项”
- 默认策略：
  - profile=default：只启用 core + scenario（由后端决定具体集合）
  - 勾选属于“扩展 eligible 集合”，不直接影响“每轮注入数量上限”

### 5.3.4 配置作用域与合并顺序（建议）

为满足“全局应用于默认智能体的所有聊天会话”（参考 Image #1）的产品预期，需要明确配置作用域：

- **默认（全局）**：user 维度默认 selection（建议存 localStorage；P2 再落库）
- **项目级**：project 维度覆盖（可选；用于某些项目强约束）
- **会话级**：thread/chat 维度临时覆盖（可选；用于一次性任务）

合并顺序建议（从低优先级到高优先级叠加）：

1) server 默认（基于 `defaultVisibility` + phase/context）
2) user 全局 selection
3) project 覆盖 selection
4) 本次请求 `context.toolSelection`（临时覆盖）

最终仍由 policy 输出“每轮注入 tools”，并保证 confirmed gate 不可绕过。

## 5.4 运行时策略：分层可见，不减能力

将 tools 暴露分成四层：

- Core：默认可见（高频查询 + 低风险动作）
- Scenario：按 phase/context 自动出现
- Extended：按 profile packs 开启
- Guarded：高风险可见但 gated（需 confirmed）

落地建议：

- 初始 Core/Scenario 集合可参考 `docs/project_agent_tool_allowlist.md` 作为 seed（但最终必须落在“元数据+策略”而非 route 或 operationId 特判）。

收益：
- 模型视野收敛
- 行为更稳定
- 保留完整能力面

## 5.5 质量治理：配套观测与守卫测试

新增监控维度：
- 每轮可见工具数（分位数）
- 工具调用命中率（可见后被调用比例）
- gated 命中率与确认转化率
- 无效调用率（schema invalid/not found）

新增测试类型：
- policy 单元测试（phase/context/profile 组合）
- runtime 注入测试（enabledTools 数量与内容）
- 高风险门控测试（可见但需确认）
- API/tool channel 一致性测试

---

## 6. 分阶段落地计划

### Phase 1（P0，低风险改造）

目标：先引入策略层，不改 operation execute 行为。

- 扩展 operation 类型，增加 channels/tool/selection（含 defaultVisibility 与 UI 分组元数据）。
- 为高频 operation 补齐元数据（先覆盖前 20% 高频能力）。
- runtime 由“全量映射”改为“策略筛选后映射”。
- 增加 policy 单测与 runtime 选择单测。

### Phase 2（P1，前后端联动）

目标：支持前端可配置启用（工具配置 UI）。

- 增加 Tool Catalog API（项目维度）：给前端渲染配置 UI。
- useAssistantChat context 增加 `toolSelection`（或 `toolSelectionKey`）。
- chat route 透传并校验 selection（校验逻辑必须下沉到 `src/lib/**`，route 仅做鉴权与参数校验 + 调用）。
- 后端合并 selection + phase/context 计算最终每轮 enabledTools（仍执行 Top N 注入）。
- 前端实现配置弹窗：树形分组 + 搜索 + 已选计数，并持久化 selection（P1 localStorage）。

### Phase 3（P1/P2，质量收口）

目标：减少调用歧义与回归成本。

- 优先替换高价值 operation 的 z.unknown() 输出 schema。
- 建立工具暴露规模阈值告警（例如默认可见数上限）。
- 对低命中、重复语义 operation 做归并评审（不删能力，做映射或别名治理）。
- （可选）将 toolSelection 持久化到服务端（多端一致），并增加“配置版本”与“回滚”能力。

---

## 7. 成功标准（验收）

1. 默认会话可见 tools 显著下降（建议目标 25-50）。
2. 工具总能力不下降（161 工具侧能力仍可通过策略组合触达）。
3. 高风险工具未经确认不可执行。
4. 前端可通过“工具配置 UI”修改 eligible 工具集合，且 UI 不写死 tool 列表（来自后端 catalog）。
5. 回归测试可证明策略稳定且无硬编码分支（尤其禁止按 operationId 特判）。

---

## 8. 建议优先改动文件

- src/lib/operations/types.ts（新增 channels/tool/selection 类型）
- src/lib/project-agent/runtime.ts（接入 policy 过滤器）
- src/lib/operations/registry.ts（可保留现状，仅补 metadata 校验）
- src/components/assistant/useAssistantChat.ts（前端 `toolSelection` 透传 + localStorage 持久化）
- src/app/api/projects/[projectId]/assistant/chat/route.ts（`toolSelection` 校验与透传）
- src/app/api/projects/[projectId]/assistant/tool-catalog/route.ts（新增：Tool Catalog API）
- src/lib/project-agent/tool-catalog.ts（新增：工具目录构建，按 groups/tags/visibility 输出）
- src/lib/project-agent/tool-selection.ts（新增：Tool Selection 类型与校验、合并策略）
- tests/unit/project-agent/*（policy/runtime 选择测试）
- tests/unit/operations/*（metadata 与 channel 一致性测试）

---

## 9. 风险与规避

- 风险：metadata 初期不完整导致工具误隐藏。
  - 规避：Phase 1 先“可见优先”策略，逐步收紧。

- 风险：用户勾选过多工具导致“期望与实际注入”不一致（因 Top N 注入上限）。
  - 规避：UI 明确提示“勾选=eligible，不保证每轮全部注入”；并提供调试视图展示 hiddenReasons/入选列表。

- 风险：动态选择影响历史提示行为。
  - 规避：增加 hiddenReasons 观测，灰度发布并回放评估。

---

## 10. 结语

tools 多并不是问题本身；“无策略全量暴露”才是主要问题。推荐以 tool 元数据 + 策略执行器为中心做一次治理升级，在不减少能力的前提下，实现动态注册、动态暴露、前端可配置启用和可观测的持续优化闭环。

---

## 11. 下一步建议（可执行拆解）

> 目标：先把“全量注入”变成“可解释的策略注入”，再接上“前端配置 UI”。每一步都可单测、可观测、可回放。

### P0：后端先落地策略层（不做 UI）

- 定义 `channels/tool/selection` 类型与 Zod 校验（禁止 `any`，明确类型边界）。
- 在 registry 聚合层按模块打默认元数据（例如：read/run/task/workflow 为 core/scenario；governance 为 guarded；asset-hub 默认 hidden 但可 selectable=false）。
- 在 `src/lib/project-agent/runtime.ts` 接入 policy：从“全量”改为“Top N 注入 + hiddenReasons 输出”（hiddenReasons 先写 server log 或 part data）。
- 增加最小单测集：
  - phase/episodeId 缺失时工具隐藏逻辑
  - riskBudget=low-only 时 medium/high 不入选
  - pinnedOperationIds 上限与非法项（未知 operationId / selectable=false）必须显式失败

### P1：Tool Catalog + 前端配置 UI（localStorage 持久化）

- 新增 Tool Catalog API（project 维度，带鉴权）：返回“可勾选工具项 + 分组树信息”。
- 前端新增配置弹窗（参考 Image #1）：树形分组 + 搜索 + 已选计数 + 一键恢复默认。
- `useAssistantChat` 在 `context` 透传 `toolSelection`（或 key），并在 UI 内 localStorage 持久化。
- 新增契约测试：
  - catalog 返回排序稳定、字段齐全
  - toolSelection 透传后能影响策略结果（enabledTools 发生变化且可解释）

建议的文件落点（对应当前仓库结构）：

- Tool Catalog 构建：`src/lib/project-agent/tool-catalog.ts`
- Tool Catalog route：`src/app/api/projects/[projectId]/assistant/tool-catalog/route.ts`
- Tool Selection 协议：`src/lib/project-agent/tool-selection.ts`
- Workspace Assistant 配置 UI：`src/features/project-workspace/components/workspace-assistant/ToolConfigModal.tsx`

### P2：服务端持久化（多端一致，可选）

- 将 selection 落库到 userPreference（JSON 字段）或独立表（按 userId+assistantId+projectId 维度）。
- 提供版本化与回滚（防止一次配置误操作导致长期不可用）。
  - 独立表落地时注意：这是 DB 结构变更，移交/部署后需要在目标库执行一次 `npx prisma db push`（或对应迁移流程），否则会出现 “table does not exist”。

### 明确的失败策略（必须）

- toolSelection 引用未知 operationId / 不可配置（selectable=false）/ 超出上限：必须 `INVALID_PARAMS` 明确失败，不允许静默忽略或自动降级。
- 即使工具被启用：仍必须通过 confirmed gate 才能执行高风险操作。
