# Agent 功能与预期的差距

> 这份文档只保留差距项和补齐规划，不再重复设计与现状描述。

## 1. 结论先行

和目标态相比，当前 Project Agent 的最大问题不是“没有能力”，而是“能力已经有了，但还有几处不够收敛”。

当前差距主要集中在四类：

1. 状态表达还可以更统一。
2. 工具选择还可以更精准。
3. UI / 状态桥接还可以更少绕路。
4. 工程结构还可以继续削薄。

## 2. 差距清单

### 2.1 状态层

- 现在已经有 lite / full projection，但运行时仍然会把 phase summary、tool summary 这类文本注入 prompt。
- projection 和 context 已经分层，但还需要持续约束哪些场景读 lite，哪些场景读 full，避免以后再长回“到处查 DB”。
- 当前状态读取已经足够覆盖主链路，但仍有少数边缘场景需要继续校准字段粒度。

### 2.2 工具层

- 工具动态裁剪已经上线，但工具选择逻辑仍然依赖 route / phase / scope / risk 的综合评分，后续需要继续验证是否会漏掉某些低频但必要的工具。
- 路由判定当前仍需升级为 **LLM-first**：先用一次模型调用判断 intent / domain / node，再决定注入哪些 tools；现阶段不能继续依赖规则路由作为运行时兜底。
- 路由阶段若模型输出不合法、置信度不足或语义冲突，必须显式报错或向用户追问澄清；禁止静默 fallback 到规则路由。
- confirmed gate 已经存在，但未来如果要做预算授权，还需要补预算语义和审计字段。
- tool 描述和分组仍可以继续增强，让模型更容易理解何时该用、何时不该用。

### 2.3 UI / 交互层

- 现在的 assistant UI 已经能展示 phase、确认请求、任务提交和 workflow 状态，但针对复杂 act-mode 的对比渲染仍不够丰富。
- 事件桥接和服务端权威状态之间仍有一定过渡痕迹，后续可以进一步减少前端“补同步”的成分。

### 2.4 工程层

- project-agent 相关逻辑虽然已经拆成多个领域文件，但主链路仍然需要继续削薄。
- project-context / project-projection / operations 的边界已经比早期清楚，但还可以继续减少重复读取和重复归纳。
- 文档体系已经需要固定下来，否则很容易再次出现多个版本同时描述同一件事。

### 2.5 Skills / workflow 层

- skills 的三类分层还需要进一步明确并在代码里稳定落地：`project-workflow`、agent-saved、user-installed。
- 目前虽然已有 workflow / saved skill / assistant platform skill 的雏形，但还需要把“开发者维护”“agent 沉淀”“用户安装”三种来源在目录、命名和 UI 上清楚区分。
- skills 的调用入口仍偏弱，后续需要更显式的 skills / workflow 调用 UI。

### 2.6 消息与上下文管理

- **当前状态**（审计于 2026-04-20）：
  - `UIMessage[]` 全量透传未解决：`src/lib/project-agent/runtime.ts` L214 将完整消息数组传递给模型，无窗口化/压缩逻辑
  - 持久层无压缩策略：`src/lib/project-agent/persistence.ts` L83/91 存储整个消息数组到 `messagesJson` 列，无截断或汇总
  - 无消息级摘要：grep 扫描全库，找不到消息数组级别的压缩/截断代码（仅发现 phase/context 摘要，不涉及消息历史）
  - 长会话风险：消息数量无限增长 → token 消耗无界 → 成本和延迟无上限
- 上下文注入已部分优化（phase summary、tool summary 已注入 system prompt），但仍为文本化而非可查询状态。
- 需要补齐消息窗口策略（如保留最后 N 条 + 压缩尾部）和触发条件（如消息数 > 50 或 token 占用 > 80%）。

## 3. 补齐规划表

| 优先级 | 差距项 | 目标状态 | 建议动作 | 验收方式 |
| --- | --- | --- | --- | --- |
| P0 | UIMessage 全量透传与消息压缩 | 长会话消息不爆炸；token 消耗可控 | 在 persistence / runtime 实现消息窗口与压缩；触发条件为消息数 > 50 或 token % > 80% | 压缩单测 + integration 测试 |往返模拟长会话 |
| P0 | 状态注入仍偏文本化 | prompt 只保留规则，状态主要由 tool / projection 读取 | 继续压缩 runtime prompt，把可变状态尽量移出 system prompt | runtime 单测 + 代码审查 |
| P0 | 路由仍为规则优先 | tool 注入前先做一次 LLM 路由判定；无规则兜底 | 在 runtime 中增加首轮模型路由调用，schema 校验输出；若不确定则显式报错或追问澄清 | router 单测 + runtime 集成测试 |
| P0 | tool 错误与确认语义继续稳固 | 所有可恢复失败都能返回结构化结果 | 保持 tool adapter 统一封装，补齐边界 case | adapter 单测 |
| P1 | 工具选择继续精调 | 不漏掉必要工具，不暴露无关工具 | 持续调整 route / phase / risk 的评分策略 | tool selection 单测 |
| P1 | budget 语义预留 | 确认语义可升级为预算语义 | 在 sideEffects / context 中保留预算字段 | 协议测试 |
| P1 | 富渲染能力补齐 | 复杂 act-mode 有更好可视化反馈 | 增加更多 preview / compare / diff 型卡片 | component / integration 测试 |
| P2 | 状态桥接继续收敛 | assistant 与 workspace 使用更统一的数据源 | 减少事件桥接，逐步统一服务端状态源 | integration 测试 |
| P2 | 目录继续削薄 | project-agent 主链路更短、更清晰 | 继续拆分剩余大文件和重复层 | typecheck + unit 测试 |
| P2 | 文档稳定化 | 三份文档长期保持一致 | 以后只维护这三份，不再新增并行稿 | 文档审查 |
| P2 | skills 三类分层 | project-workflow / saved / installed 清晰区分 | 统一目录、来源标记和命名约定 | 文档审查 + unit 测试 |
| P2 | skills 调用入口 | workflow / skills 可显式调用 | 增加入口 UI 与说明卡片 | component / integration 测试 |

## 4. 具体落点

### 4.1 短期

- **实现消息压缩与窗口化**（P0 依赖项）：
  - 在 `src/lib/project-agent/persistence.ts` 中实现 `compressMessages()` 函数，采用"保留最后 N 条 + LLM 汇总更早消息"策略
  - 在 route 层 (`src/app/api/projects/[projectId]/assistant/chat/route.ts` L99 前后) 添加检查：当消息数 > 50 或消息 token 占用 > 80% 时触发压缩
  - 在 runtime 层 (`src/lib/project-agent/runtime.ts` L214 前) 补齐消息窗口校验
  - 新增测试：`tests/unit/project-agent/message-compression.test.ts`（压缩逻辑）和 `tests/system/long-conversation.test.ts`（长会话 token 不爆炸）
- **实现 LLM-first 路由并移除规则兜底**（P0 依赖项）：
  - 在 `src/lib/project-agent/router.ts` 中改为一次独立模型调用，输出 `intent / domains / nodeId / confidence / needsClarification / clarifyingQuestion`
  - 在 `src/lib/project-agent/runtime.ts` 中先执行路由调用，再根据路由结果动态裁剪 tools 后进入主 agent 流程
  - 路由输出若不满足 schema、置信度不足或需要澄清，必须直接报错或向用户发出澄清问题，禁止静默回退到规则路由
  - 新增测试：路由 schema 失败、低置信度澄清、正常选 tool 三类用例
- 继续收敛 runtime prompt，让它更像规则集，而不是状态拼接器。
- 持续校准工具选择策略，确保低频场景不被误过滤。
- 补充更完整的富渲染卡片，尤其是对比前后方案和任务状态结果。
- 实现对话面板的 markdown 渲染，优先补齐代码块、列表、引用、链接和长文本折行的视觉一致性。
- 把确认框 / 方案选择组件前置到 UI 层，减少 confirmed gate 直接消耗 agent step 的情况。
- 增加显式的 tools 选择开关和当前可用工具说明，帮助用户理解当前会话可执行范围。
- 把音视频图的对比展示先做成富卡片形态，至少支持前后方案并排、差异摘要和结果回看。

### 4.2 中期

- 让 projection 成为更多读取场景的默认入口。
- 进一步统一 assistant / workspace 的状态表达。
- 继续拆分大文件，减少 project-agent 主入口的体量。
- 增加显式的 skills / workflow 调用入口，让用户能直接查看、安装、启用和调用不同来源的 skill。
- 增加显式的 plan mode 切换 UI，让规划、审批和执行的边界在界面上更可见。
- 增加问答能力入口，覆盖 agent 功能问答和项目状态问答，降低用户对 prompt 和内部状态的记忆成本。

#### 4.2.1 对话框样式示意（ASCII）

```text
+--------------------------------------------------------------------------------+
|                            Assistant 对话窗口                                  |
|--------------------------------------------------------------------------------|
|  对话内容区（消息流 / 卡片 / 任务结果 / 审批状态）                            |
|                                                                                |
|--------------------------------------------------------------------------------|
| [模式: (●) Plan | ( ) Fast] [Skills 列表 v] [Tools 开关 v] [发送]             |
|   Skills 展开后：                                                              |
|   - project-workflow / ...                                                     |
|   - saved-skills / ...                                                         |
|   - installed-skills / ...                                                     |
|   -> 选中并点击某个 skill 后，切换到新的对话窗口并开始执行                    |
+--------------------------------------------------------------------------------+
| [已使用: 1200] [限额: 5000 (可编辑)] [模型设置] [更多设置]                    |
+--------------------------------------------------------------------------------+
```

该示意图对应的交互约束：

- 对话框底部必须固定包含 Plan/Fast 模式切换、Skills 入口、Tools 开关入口和发送键。
- Skills 列表必须支持展开、选中、点击执行；点击后进入新的对话窗口并开始该 skill 对应流程。
- 对话框下方的底部控制区预留未来能力入口，至少包括“已使用/限额（可编辑）”与“模型设置”。
- Plan/Fast、Skills、Tools 的当前状态要在 UI 中可见，避免用户误以为当前会话拥有未开启能力。

### 4.3 长期

- 如果未来引入预算授权，就把 confirmed gate 变成“确认 + 预算”双语义。
- 如果未来出现更复杂的多步编排，再考虑更强的规划与恢复机制，但不要先引入新的通用中台。

## 5. 需要补充的 idea

这些 idea 不是立即实现清单，而是后续设计和迭代要持续对齐的方向：

- 多模态能力：自动审查分镜一致性，例如角色衣着、场景连续性，可能需要新 skill。
- 是否为 agent 配备沙盒环境作为兜底能力。
- 分镜重生时支持参考其他分镜，需要补全 panel 详情读取并扩展 regenerate 参数。

## 6. 结语

当前最重要的不是再造一个新 agent，而是把已经能跑的能力收紧成稳定、可解释、可验证的系统。

只要后续改动继续围绕“统一状态、统一工具、统一错误、统一测试”，这个 agent 就会越来越像真正的项目助手，而不是一个功能堆砌器。
