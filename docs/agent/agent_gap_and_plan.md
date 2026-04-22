# Agent 剩余缺口与推进计划

> 这份文档只保留**未完全完成**和**未开始**的内容。
> 已完成内容统一记录到 `agent_delivery_progress.md`。
> 最近整理日期：2026-04-21

## 1. 当前判断

Project Agent 的核心 P0 主链路已经完成，当前工作重点不再是“补架构”，而是：

1. 补齐 `interactionMode` 的最终交互体验。
2. 把工具选择从“测试已覆盖”推进到“生产可验证”。
3. 丰富前端的确认、方案、对比与回看体验。
4. 为后续 skills / 预算 / 多模态审查留出清晰扩展位。

换句话说，现在最重要的不是再加一套新 agent 结构，而是把已经能跑的主链路收紧成：

- 更可解释
- 更可审计
- 更好用

## 2. 缺口分层

### 2.1 P1：已部分完成，但还不够好

这些是当前最值得继续推进的内容。

#### P1-A interactionMode 交互完善

当前状态：

- 已有 `auto / plan / fast` 三态。
- 已有 `execution-mode`，显式 mode 和 router intent 不再直接冲突。
- 已有模式说明、待审批/待确认动作区。

仍然缺的部分：

- `plan` 模式下还缺更强的“执行冻结”感知，例如更明确的边界提示。
- 缺少对“确认后继续执行”这类路径的更强组件级交互测试。
- workflow 计划、审批、执行完成之间仍缺少更顺滑的串联 UI。

目标状态：

- 用户一眼能看出自己当前处于 `auto / plan / fast` 的哪种语义。
- `plan` 模式下不会误以为系统已经执行。
- 审批、确认、执行结果三段体验连贯。

建议动作：

1. 增强模式说明文案与视觉提示。
2. 增加 `plan` 模式下的预确认/预执行提示。
3. 补一条组件级交互测试，覆盖“确认后继续执行”的真实路径。

验收方式：

- component test
- interaction test
- 人工走查 `plan -> confirm -> execute`

#### P1-B 工具选择的生产验证

当前状态：

- 当前已落地基于 `requestedGroups` 的 group 注入（替代旧的打分选择机制）。
- 已有 unit / scenario / runtime 级测试。
- runtime 已开始写工具选择日志。

仍然缺的部分：

- 还没有把这些日志转成可消费的验证材料。
- 还没有针对真实对话样本做稳定回放验证。
- 还缺少“为什么选到这些工具”的可视化分析视角。

目标状态：

- 能从真实会话中审计：
  - routed intent
  - effective intent
  - requestedGroups
  - selected tools
- 能快速识别漏召回和误召回。

建议动作：

1. 固化工具选择日志字段。
2. 增加真实对话回放样本测试。
3. 视需要增加内部调试视图或导出脚本。

验收方式：

- 日志抽样审查
- runtime / integration test

#### P1-C 确认框 / 方案选择继续前置

当前状态：

- 审批和确认动作已经前置到 Assistant 面板中的“待处理动作”区。
- 不再只依赖消息流内卡片。

仍然缺的部分：

- 还没有真正的“方案选择”组件，例如多个可执行方案的并列选择。
- 确认动作虽然已前置，但对复杂操作仍缺少“预览将执行什么”的 richer 卡片。
- 缺少统一的“待处理动作”排序/聚合规则文档。

目标状态：

- 审批、确认、方案选择都在 UI 层显式完成。
- agent step 不再承担大量“为了确认而确认”的对话消耗。

建议动作：

1. 为复杂动作增加 preview / compare / diff 卡片。
2. 对多方案场景补 `方案选择组件`。
3. 统一待处理动作的聚合与优先级逻辑。

验收方式：

- component / integration test

#### P1-D 富渲染能力补齐

当前状态：

- markdown 基础渲染已完成。
- 基础任务状态卡片、审批卡片、确认卡片已存在。

仍然缺的部分：

- 缺少真正的 compare / diff / before-after 视图。
- 缺少更强的 workflow 结果回看体验。

目标状态：

- 复杂 act-mode 的结果可以被低成本理解和审阅。

建议动作：

1. 为音/图/视频补前后方案并排卡片。
2. 为计划结果补 diff / summarize 视图。

验收方式：

- component / integration test

### 2.2 P2：结构已具备，但产品入口未完成

#### P2-A Skills 统一入口

当前状态：

- `skill-system/` 已有。
- `saved-skills/` 已有。
- 三类 skills 的代码分层已有雏形。

缺口：

- 没有统一的浏览、安装、启用、调用入口。
- 用户还无法明确感知：
  - developer-maintained workflow
  - agent-saved skill
  - user-installed skill

目标状态：

- skills 在 UI 上能被清楚区分和调用。

#### P2-B 预算语义

当前状态：

- confirmed gate 已有。
- 结构化确认请求已存在。

缺口：

- 还没有预算字段和预算授权语义。

目标状态：

- 未来可把“确认”升级为“确认 + 预算”。

#### P2-C 状态桥接继续收敛

当前状态：

- projection/context 已经比早期统一很多。

缺口：

- assistant 与 workspace 仍有部分事件桥接痕迹。

目标状态：

- 状态源进一步统一，减少前端补同步逻辑。

### 2.3 P3：后续能力扩展

这些不是当前优先项，但文档保留方向即可：

- 多模态一致性审查
- Agent 沙盒

## 3. 建议优先级

### 第一优先级

1. `interactionMode` 交互补齐
2. 工具选择生产验证
3. richer 确认/方案选择 UI

### 第二优先级

1. skills 统一入口
2. 富渲染 compare / diff 体验
3. 预算语义预留

### 第三优先级

1. 状态桥接继续收敛
2. 多模态一致性审查
3. Agent 沙盒

## 4. 下一阶段建议执行顺序

1. 完善 `interactionMode` UI 和确认后继续执行链路测试。
2. 做工具选择日志消费与真实会话回放验证。
3. 增加 richer preview / compare / diff 卡片。
4. 再推进 skills 统一入口。

## 5. 与 delivery_progress 的边界

以下内容**不再在本文件重复描述**，统一视为已完成，详见 `agent_delivery_progress.md`：

- LLM-first 路由
- 消息压缩与窗口化
- 动态工具选择主链路
- system prompt 去状态化
- confirmed gate / 结构化错误
- operation registry 统一
- execution-mode 解析
- `auto / plan / fast` 三态基础能力
