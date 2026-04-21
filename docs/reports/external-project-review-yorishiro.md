# 外部项目借鉴记录：Yorishiro（swordfeng/yorishiro）

> 目标：只借鉴思想与结构，不引入该仓库代码。本文刻意使用 **GitHub permalinks（固定 commit）** 引用，避免依赖本地 clone 路径；即使之后移除 `yorishiro/` 子仓库，本记录仍可追溯。

## 0. 基本信息（可追溯快照）

- 上游仓库：`https://github.com/swordfeng/yorishiro`
- 本次分析快照：`a492c023114eac5772ba4cd21cf9bb47c15933a1`（commit message: `feat: add subtitles backend for film.audio.stt`，committer time: `2026-04-17T01:49:34-07:00`）
- 代码定位约定：以下引用均以 `swordfeng/yorishiro@a492c02` 为基准（前 7 位仅用于展示，链接使用全 hash）。

## 1. 一句话结论（对 waoowaoo 的借鉴价值）

Yorishiro 的最大价值不在“某个模型/某个 prompt”，而在它把“角色人设”拆成了可回溯的结构化产物（逐场景的证据笔记 → 逐角色的汇总洞察 → 最终 SOUL 文档），并且强制提取 **语言风格/微习惯/负面约束信号/知识边界线索** 等能直接服务于“剧本/台词生成一致性”的信息；再用 **Task/Step + staleness + 快照备份** 组织成可复跑流水线。这套“结构化人设资产 + 增量编排 + 可回滚”的工程化思路，对 `waoowaoo` 当前阶段（基于文本故事/人设图生成剧本再生成音视频）更贴合。

## 2. 本次关注点：人设提取与“个性化小习惯”提取（而非低 OOC 对话）

本记录将 Yorishiro 的能力拆成两块：

1) **现阶段重点（本章展开）**：从已有故事文本中，抽取可落地用于“剧本/台词/镜头生成”的角色人设资产，尤其是“语言风格 + 微习惯/仪式 + 感官触发器 + 负面约束信号”。  
2) **下一阶段探索（后文单独章节收束）**：低 OOC 的角色扮演对话、运行时记忆系统（Index/RAG/MCP）等。

## 3. Yorishiro 在解决什么问题（抽象到第一性原理）

### 3.1 问题定义

- 输入：小说/电影/设定集/访谈等多源材料（长文本 + 多模态 + 多版本事实）
- 输出：一份可作为 system prompt 或“角色一致性资料”的角色人格文档 `SOUL.md`，用于支撑后续生成任务（台词风格、行为边界、阶段性人设等）

参考：
- README 中对 `SOUL.md` 结构维度的定义（Core Identity、Voice、Negative Constraints、World Knowledge…）
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/README.md#L10-L30

### 3.2 人设资产的最小闭环：逐场景笔记 → 逐角色洞察 → 角色文档

Yorishiro 把“人设提取”做成了一个可积累的闭环，而不是“一次性让 LLM 写一个角色小传”：

- **逐场景（per character × scene）**：输出结构化 `CharacterSceneNote`，用来沉淀“当下这个 scene 中角色怎么说、怎么做、在回避什么、有什么微习惯/语言重复”。
- **逐角色（per batch）**：输出 `SoulDocAppend`，把跨 scene 的归纳洞察写回角色长期资产（并要求带 scene 引用以保证可追溯）。
- **最终合成**：在合成阶段明确要求扫描 `repeated_expressions` / `comfort_mechanisms` / `sensory_triggers` 等字段，把“口头禅/微习惯”写进最终文档的相应章节。

参考（结构化字段与提取指令）：
- `CharacterSceneNote` 字段定义（含 `comfort_mechanisms` / `repeated_expressions` / `sensory_triggers` / `actions_avoided` 等）
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/yorishiro/novel/character_extraction.py#L55-L80
- 人设提取 prompt 中对“微习惯/口头禅/感官触发器”的明确要求
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/yorishiro/novel/character_extraction.py#L180-L255
- 合成阶段对 `repeated_expressions` 与 “Habitual Behaviors & Rituals” 的扫描要求
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/yorishiro/synthesize.py#L87-L162

## 4. Yorishiro 的工程化抓手（最值得借鉴的“机制”）

### 4.1 Task/Step 抽象 + staleness（增量重跑）

把每一步拆成：
- `Task`：声明输入/输出路径；用一个 completion marker 的 mtime 做“是否过期”的判定；仅在 stale 时执行。
- `Step`：聚合多个 Task（例如按章节/按角色批处理），并支持选择性执行 `--task`。

参考：
- `Task.is_stale()` + `Task.run()` + `Step.run()` 的最小实现
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/yorishiro/tasks/base.py#L9-L120

对 waoowaoo 的启发：
- 你们当前是“worker + DB 任务”体系；同样可以引入 **显式的产物版本/输入指纹（fingerprint）**，让重生成从“整条链路重跑”变成“只重跑受影响的子步骤”，并且能把每次生成的输入/输出关联到一个可追溯版本。

### 4.2 编排器（Orchestrator）+ step prefix 展开（可组合执行）

支持 `film.audio` 这种前缀展开成多个叶子步骤，并按固定依赖顺序执行。

参考：
- `expand_step_prefix()`（prefix → leaf steps）
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/yorishiro/pipeline/orchestrator.py#L50-L66

### 4.3 运行后快照备份（hardlink 去重 + 保留策略）

每次执行后对项目产物做 snapshot；未变化文件 hardlink 复用，降低存储；并有“近 4 小时全保留/24 小时按小时保留/之后按天保留”的策略。

参考：
- hardlink snapshot 的总体逻辑
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/yorishiro/backup.py#L1-L107

对 waoowaoo 的启发：
- 你们的任务经常涉及“生成/重生成”且可能计费；引入“产物快照”可显著提升可恢复性与对账能力（例如：一次重生成导致效果变差/成本异常时，可快速回滚到某个快照做 diff）。

### 4.4 Step-scoped runtime registry（按 step 选择 LLM/本地模型，并缓存实例）

把每个 step 的“运行时依赖”抽象成 `agent`（LLM/VLM）或 `instance`（本地模型实例），同时为本地模型构建 cache key，避免反复加载。

参考：
- `_RuntimeSpec` / `StepRuntime.agent()` vs `StepRuntime.instance()` / `_STEP_SPECS`
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/yorishiro/tasks/registry.py#L18-L120

对 waoowaoo 的启发：
- 你们已有 `executeAiTextStep` 等运行时封装，但“同一条链路多步骤使用不同 provider/model”的配置与缓存策略，仍有进一步统一的空间（尤其是：同一任务内的多个子步骤共享上下文/共享大模型会话策略/共享限流配置等）。

### 4.5 长文本切分的“锚点协议”（end_text anchor）+ chunk grow/retry

在小说分场景中，要求模型返回每个 scene 的 `end_text`（原文末尾 40–60 字符），作为可定位锚点；若锚点无法在当前窗口中匹配，则增大 chunk 并重试。

参考：
- scene segmentation 的协议定义（`end_text`、cut rules、non-narrative handling）
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/yorishiro/novel/scene_segmentation.py#L34-L115

对 waoowaoo 的启发：
- 这是一种“LLM 输出必须可反向校验/对齐到原始输入”的设计思路，特别适合解决：
  - 长文本切分时的漏段/重段
  - 生成结果无法回溯引用原文位置的问题
- 迁移到 `waoowaoo` 的形式可以不是 `end_text`，也可以是：字符 offset、行号锚点、段落 hash 等，但核心是“可验证对齐协议”。

## 5. 对照 waoowaoo：哪些痛点高度匹配

### 5.1 你们已有的“角色”数据，更偏视觉/标签，而非“可生成台词的角色行为资产”

当前 `CharacterProfileData` 更像“资产卡片”（原型/标签/视觉关键词等），缺少支撑“稳定台词风格/稳定行为选择”的“语言风格/负面约束信号/阶段人格”等维度。

参考（waoowaoo 现状）：
- `CharacterProfileData` 字段（`personality_tags`、`visual_keywords` 等）
  - `src/types/character-profile.ts:10`

### 5.2 你们的台词分析/生成对角色一致性高度敏感

`voice-analyze` 任务会把“角色库介绍/分镜 JSON/原文”拼入 prompt 来做台词分析与匹配；只要角色设定不够稳定，台词风格就容易漂。

参考（waoowaoo 现状）：
- `voice-analyze` 里 `charactersIntroduction` 与 prompt 变量拼装
  - `src/lib/workers/handlers/voice-analyze.ts:85`

## 6. “只借鉴思想”的落地建议（按优先级）

> 下述建议只涉及“概念与协议”，不等同于要引入 Yorishiro 代码或 Python 管线。

### P0：引入“角色行为资产（SOUL-like）”作为一等产物（面向剧本/台词一致性）

建议在 `waoowaoo` 内部定义一个稳定的“角色行为资产”结构（Markdown 或 JSON 均可），重点覆盖：

- Voice & Language：口头禅/重复表达、句式节奏、情绪强时语言变化
- Micro-habits：微习惯/仪式化动作（自我安抚、压力时的小动作）
- Sensory triggers：特定歌/气味/物件/地点等触发器
- Negative signals：`actions_avoided` 这类“机会出现但角色没做”的信号（可转化为台词/分镜生成中的约束）

为什么：
- Yorishiro 在逐场景结构化笔记中把这些字段作为硬性输出，而不是后期“凭感觉总结”
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/yorishiro/novel/character_extraction.py#L55-L80
- 并在最终合成阶段要求显式扫描 `repeated_expressions` 与微习惯字段，确保落入最终文档
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/yorishiro/synthesize.py#L87-L162

### P1：为“长文本→分段→下游生成”引入可验证锚点协议

把每一次切分的结果变成“可验证”的：输出必须能映射回原文（offset/anchor/hash），并且在无法对齐时 **显式失败**（而不是静默继续）。

为什么：
- Yorishiro 的 `end_text` 协议本质是在把 LLM 输出变成“可复核的对齐信息”，减少长文本处理的不可控性
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/yorishiro/novel/scene_segmentation.py#L83-L98

### P2：对“重生成/模型切换/参数调整”引入产物快照（面向回滚与对账）

做法可以不完全照搬 hardlink snapshot，但建议具备：
- 产物版本化（每次生成一个版本号/指纹）
- 可 diff / 可回滚
- 保留策略（避免无限增长）

为什么：
- Yorishiro 把 snapshot 当作默认机制，并且考虑了存储成本（hardlink）与保留策略
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/yorishiro/backup.py#L5-L10

## 7. 不建议直接借鉴/需要警惕的点

- **把 roadmap 当成现货**：Yorishiro 的 Index/Alignment/MCP 在该快照中仍未开始（见 `docs/PLAN.md`），所以“运行时 RAG 系统”不应直接照抄其未实现部分的结构。
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/docs/PLAN.md#L21-L25
- **形态差异**：Yorishiro 是 Python 文件产物管线；`waoowaoo` 是 Web + DB + worker，多租户与审计/权限/计费约束更强，迁移应以“协议/产物/编排语义”为主，而不是复制其目录结构或运行方式。

## 8. 建议的最小验证实验（MVP）

1) 选一个已有项目 + 2 个核心角色：
   - 让系统生成一份 `SOUL-like` 的“角色行为资产”（先不做 RAG），并在台词/分镜生成 prompt 中强制引用。
   - 评估：同一段剧情重复生成多次，台词口癖/措辞/回避点是否更稳定；微习惯是否能稳定出现（而不是每次随机变化）。
2) 选一个“超长小说文本”样本：
   - 引入锚点协议（例如 scene 分段必须返回 offset + 截断锚点），对齐失败则失败。
   - 评估：重复/漏段率是否下降，错误是否更早暴露而不是在下游爆炸。

## 9. 下一阶段章节（暂不展开）：低 OOC 角色扮演对话 / 运行时记忆系统

Yorishiro README 提到的“双层记忆（SOUL.md + Memory System）”与 MCP 集成，以及 Index/RAG/Alignment 等，会更偏向“对话系统与运行时检索”的工作域；在 `waoowaoo` 当前阶段可以先不把它当作主线，但可以作为后续章节的研究方向。

参考：
- Dual-Layer Memory Architecture（思路）
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/README.md#L95-L105
- 计划与状态（Index/Alignment/MCP 仍未开始）
  - https://github.com/swordfeng/yorishiro/blob/a492c023114eac5772ba4cd21cf9bb47c15933a1/docs/PLAN.md#L7-L25
