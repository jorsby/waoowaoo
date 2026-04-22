# Agent 已完成能力与交付进展

> 这份文档只描述**已经完成**的能力、主链路和已落地测试。
> 未完成和待推进项统一记录到 `agent_gap_and_plan.md`。
> 最近整理日期：2026-04-21

## 1. 总体状态

当前 Project Agent 已经完成从“原型”到“可交付项目助手主链路”的升级。

核心结论：

- P0 主链路已完成
- 关键 P1 架构项已完成
- 当前剩余工作以交互打磨和验证增强为主

## 2. 已完成能力清单

### 2.1 核心 P0

- ✅ LLM-first 路由
- ✅ 消息压缩与窗口化
- ✅ 动态工具选择
- ✅ system prompt 去状态化
- ✅ confirmed gate
- ✅ 结构化错误返回
- ✅ operation registry 统一
- ✅ API / tool 共用执行层
- ✅ 项目阶段感知
- ✅ projection / context 分层
- ✅ 会话持久化
- ✅ stop condition

### 2.2 已完成的关键 P1

- ✅ `auto / plan / fast` 三态 interactionMode
- ✅ execution-mode 解析：显式 mode 与 router intent 统一收敛
- ✅ 模式切换会重建 chat session，真实影响后续请求
- ✅ Assistant 面板模式说明
- ✅ 待审批 / 待确认动作区前置到 UI 层
- ✅ markdown 基础渲染，含 GFM 表格支持
- ✅ 工具选择运行时日志

## 3. 当前主链路

```text
UI / API route
  -> createProjectAgentChatResponse (runtime.ts)
  -> compressMessages (message-compression.ts)
  -> resolveProjectPhase (project-phase.ts)
  -> routeProjectAgentRequest (router.ts)
  -> resolveProjectAgentExecutionMode (execution-mode.ts)
  -> selectProjectAgentOperationsByGroups (operation-injection.ts)
  -> streamText (AI SDK)
  -> executeProjectAgentOperationFromTool (tool adapter)
  -> structured result / confirmation / task / workflow data parts
```

## 4. 已落地设计点

### 4.1 Runtime

已完成：

- 消息校验
- 消息压缩
- 模型选择
- LLM-first 路由
- execution-mode 解析
- 动态工具装配
- 澄清分支短路返回
- stop controller

关键文件：

- [runtime.ts](/home/deng-shengxi/文档/videogen/waoowaoo/src/lib/project-agent/runtime.ts)
- [router.ts](/home/deng-shengxi/文档/videogen/waoowaoo/src/lib/project-agent/router.ts)
- [execution-mode.ts](/home/deng-shengxi/文档/videogen/waoowaoo/src/lib/project-agent/execution-mode.ts)
- [operation-injection.ts](/home/deng-shengxi/文档/videogen/waoowaoo/src/lib/project-agent/operation-injection.ts)

### 4.2 interactionMode

当前语义已完成：

- `auto`
  跟随 router 判定
- `plan`
  将 `act intent` 降级为 planning handling
- `fast`
  保留直接 act

并且：

- `interactionMode` 已进入 chat session id
- 切换不会只改 UI，而会影响后续消息的真实请求语义

### 4.3 确认 / 审批前置

当前已完成：

- 审批请求和确认请求通过结构化 data parts 返回
- 前端会从消息流中收集：
  - approval request
  - confirmation request
  - workflow plan snapshot
- Assistant 面板有显式“待处理动作”区
- 用户可以：
  - 批准/拒绝 plan
  - 继续执行/取消确认动作

这意味着“确认框/审批入口”已不再只依赖消息正文卡片。

### 4.4 工具选择日志

runtime 已写出工具选择日志，包含：

- interactionMode
- routedIntent
- effectiveIntent
- confidence
- domains
- requestedGroups
- selected operationIds
- clarification branch

这为后续生产验证提供了基础观测面。

### 4.5 markdown 渲染

已完成：

- 基础 markdown 渲染
- 代码块
- 列表
- 引用
- 链接
- GFM 表格

关键文件：

- [MarkdownTextPart.tsx](/home/deng-shengxi/文档/videogen/waoowaoo/src/features/project-workspace/components/workspace-assistant/MarkdownTextPart.tsx)

## 5. 测试覆盖

### 5.1 Project Agent 相关

- `runtime-routing.test.ts`
- `router.test.ts`
- `execution-mode.test.ts`
- `operation-injection.test.ts`
- `message-compression.test.ts`
- `persistence.test.ts`
- `tool-adapter.test.ts`
- `tool-adapter-gates.test.ts`
- `api-adapter.test.ts`
- `presentation.test.ts`
- `stop-conditions.test.ts`

### 5.2 Assistant 面板相关

- `workspace-assistant-runtime-id.test.ts`
- `workspace-assistant-markdown.test.tsx`
- `workspace-assistant-approval-state.test.ts`

### 5.3 route / integration

- `project-assistant-chat.route.test.ts`

## 6. 与 gap_and_plan 的边界

以下内容不再作为“差距”描述，而统一视为已完成：

- LLM-first 路由
- 动态工具选择主链路
- system prompt 去状态化
- interactionMode 三态基础能力
- execution-mode 解析
- 确认/审批前置基础能力
- 工具选择日志基础能力
- markdown 基础渲染

真正剩余的未完成项，请看 `agent_gap_and_plan.md`。
