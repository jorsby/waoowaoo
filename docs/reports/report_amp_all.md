# waoowaoo 代码库全面分析报告

> 分析日期：2026-03-29  
> 项目概况：基于 Next.js 15 (App Router) 的 AI 视频生成平台，集成多个 AI 模型提供商（火山引擎 ARK、FAL、Google Gemini/Veo、MiniMax、Vidu、百炼、硅基流动等），支持从小说/剧本到分镜→图片→语音→视频的完整 AI 影视制作流水线。

---

## 一、根目录（顶层文件）

### 1.1 功能描述
项目配置文件、Docker 部署、CI/CD、构建配置等。

### 1.2 发现的问题

#### 🔴 双重 middleware 文件
- **根目录** `middleware.ts` 和 **`src/middleware.ts`** 同时存在，且逻辑不同：
  - 根目录版本使用 `routing` 对象（来自 `src/i18n/routing.ts`）
  - `src/` 版本使用 `locales` + `defaultLocale`（来自 `src/i18n.ts`），还配置了 `localeDetection: false`
- Next.js 仅识别根目录的 `middleware.ts`，`src/middleware.ts` 是**死代码**。
- **建议**：删除 `src/middleware.ts`。

#### 🔴 双重 lock 文件
- 同时存在 `package-lock.json` 和 `pnpm-lock.yaml`，说明项目在 npm 和 pnpm 之间摇摆。
- **建议**：选定一个包管理器，删除另一个 lock 文件。

#### 🟡 遗留/临时文件未清理
- `.tmp_check_task.ts`：临时调试脚本遗留在根目录。
- `debug-request.json`：调试请求数据。
- `extract_chinese.py`：Python 脚本，与项目技术栈不一致。
- `report.md` / `report_all.md`：历史报告文件。
- **建议**：移入 `.tmp/` 或添加到 `.gitignore`。

#### 🟡 `src/pages/` 目录残留
- 仅包含一个 `_document.tsx`（Pages Router 遗留），但项目已全面使用 App Router (`src/app/`)。
- Next.js App Router 的 layout.tsx 已取代 _document.tsx 的功能。
- **建议**：验证后删除 `src/pages/` 目录。

---

## 二、`src/` 目录总览

### 2.1 目录结构

```
src/
├── app/          # Next.js App Router（页面 + API）
├── assets/       # 字体文件
├── components/   # React 组件
├── contexts/     # React Context
├── features/     # 功能模块（仅 video-editor）
├── hooks/        # 自定义 Hooks
├── i18n/         # 国际化配置
├── lib/          # 核心业务逻辑 ★ 最大问题区域
├── pages/        # Pages Router 残留（应删除）
├── styles/       # CSS 样式
├── types/        # TypeScript 类型
├── i18n.ts       # 国际化入口
├── instrumentation.ts  # Next.js 遥测
└── middleware.ts # 死代码（与根目录重复）
```

### 2.2 架构级问题

#### 🔴 `src/lib/` 是一个巨型"万能抽屉"
`src/lib/` 包含 **33 个子目录 + 35 个散落的顶层文件**，是整个项目最严重的组织问题。子目录涵盖了从 AI 运行时、计费、错误处理、日志、存储到工作流引擎等所有服务端逻辑，而顶层文件则是各种无法归类或来不及整理的独立模块。

这导致：
- 新开发者无法直觉判断某个功能在哪里
- 相关功能散落在不同位置（如 3 个异步任务文件散落在顶层）
- "有目录的模块"和"没目录的散落文件"混合，一致性差

---

## 三、`src/lib/` 逐项分析（核心问题区域）

### 3.1 顶层散落文件分析

#### 🔴 错误处理体系碎片化（5 个文件/目录，职责重叠）

| 文件/目录 | 职责 |
|-----------|------|
| `errors/codes.ts` | 统一错误码目录（ERROR_CATALOG） |
| `errors/types.ts` | NormalizedError 类型 |
| `errors/normalize.ts` | 通用错误标准化 |
| `errors/display.ts` | 错误展示 |
| `errors/extract.ts` | 错误信息提取 |
| `errors/user-messages.ts` | 用户友好消息 |
| `api-errors.ts` | ApiError 类 + apiHandler + normalizeError（**568 行巨文件**） |
| `error-handler.ts` | handleApiError + checkApiResponse（客户端错误处理） |
| `error-utils.ts` | isAbortError + safeAlert + resolveClientError |
| `prisma-error.ts` | Prisma 错误判断 |

**问题**：
- `api-errors.ts` 既定义 `ApiError` 类、又实现 `apiHandler` 包装器、又内嵌完整的 LLM 流式回调构建逻辑——严重违反单一职责
- `error-handler.ts` 和 `error-utils.ts` 都处理客户端错误但方式不同
- `api-errors.ts` 中有自己的 `normalizeError()`，`errors/normalize.ts` 也有 `normalizeAnyError()`，名称相似但层级不同
- **建议**：将 `api-errors.ts` 拆分——`ApiError` 类归入 `errors/`，`apiHandler` 独立为 `api-handler.ts`，LLM 流式回调逻辑归入 `llm-observe/`。合并 `error-handler.ts` + `error-utils.ts` 为统一的客户端错误模块。

#### 🔴 异步任务处理碎片化（3 个文件，合计 ~1800 行）

| 文件 | 职责 |
|------|------|
| `async-poll.ts` | 统一轮询入口（~980 行），包含所有 provider 的 poll 逻辑 |
| `async-submit.ts` | FAL/ARK 任务提交 + 查询 |
| `async-task-utils.ts` | Gemini/Veo/Seedance 任务查询 |

**问题**：
- `async-poll.ts` 是一个 ~980 行的巨文件，每新增一个 provider 就多加一段几乎相同结构的 `case` 分支
- `async-submit.ts` 中的 `queryArkVideoStatus()` 和 `async-task-utils.ts` 中的 `querySeedanceVideoStatus()` 调用同一个 ARK API endpoint，**逻辑重复**
- **建议**：将每个 provider 的 poll/submit 逻辑拆到 `providers/` 对应子目录，`async-poll.ts` 仅保留路由分发。

#### 🔴 火山引擎 ARK 接口碎片化

| 文件 | 职责 |
|------|------|
| `ark-api.ts` | ARK REST API 封装（图片/视频生成） |
| `ark-llm.ts` | ARK Responses API 封装（LLM） |
| `generators/ark.ts` | ARK 视频生成器（通过 factory） |
| `llm/providers/ark.ts` | ARK LLM provider |

**问题**：
- `ark-api.ts` 自行实现了 `fetchWithRetry`、`normalizeError` 等通用工具，与项目已有的重试/错误机制完全独立
- `ark-api.ts` 中有大量中文日志硬编码，未走国际化
- **建议**：统一到 `providers/ark/` 目录下。

#### 🟡 配置读取有两个入口

| 文件 | 职责 |
|------|------|
| `api-config.ts` | API 配置读取器（~500 行，直接查 Prisma） |
| `config-service.ts` | 统一配置服务（~345 行，也查 Prisma） |

两者都做 `parseModelKey`、`composeModelKey`，都查数据库获取模型配置，但接口和返回类型不同。`config-service.ts` 还有 `parseModelKey` 函数是对 `model-config-contract.ts` 中 `parseModelKeyStrict` 的薄包装。

**建议**：合并为单一配置服务。

#### 🟡 其他散落文件

以下顶层文件按职责应归入对应子目录：

| 文件 | 应归入 |
|------|--------|
| `prisma.ts` / `prisma-error.ts` / `prisma-retry.ts` | `db/` 或合并为一个 `prisma/` 目录 |
| `redis.ts` | `db/` |
| `rate-limit.ts` | `middleware/` 或 `api/` |
| `srt.ts` | `media/` 或 `generators/audio/` |
| `word-count.ts` | `utils/` |
| `json-repair.ts` | `utils/` |
| `crypto-utils.ts` | `utils/` |
| `fonts.ts` | 与 `src/assets/fonts/` 合并 |
| `server-boot.ts` | `bootstrap/` |
| `image-cache.ts` / `image-label.ts` | `media/` |
| `storyboard-phases.ts` / `episode-marker-detector.ts` | `novel-promotion/` 或 `workflow-engine/` |
| `modes.ts` | `constants.ts` 合并 |
| `workflow-concurrency.ts` | `workflow-engine/` |
| `openai-compat-media-template.ts` / `openai-compat-template-runtime.ts` | `model-gateway/openai-compat/` |
| `model-config-contract.ts` | `model-gateway/` 或 `config/` |
| `gemini-batch-utils.ts` | `providers/google/` |
| `api-auth.ts` / `api-fetch.ts` | `api/` 目录 |
| `app-meta.ts` | `config/` |
| `update-check.ts` | `home/` |
| `media-process.ts` | `media/` |

### 3.2 `src/lib/` 子目录逐项分析

#### `ai-runtime/` ✅
- **功能**：AI 运行时客户端抽象层
- **文件数**：4（client.ts, errors.ts, index.ts, types.ts）
- **评价**：结构清晰，职责单一。

#### `asset-utils/` ✅
- **功能**：资产 AI 设计工具函数
- **文件数**：2（ai-design.ts, index.ts）
- **评价**：正常。

#### `assets/` ✅
- **功能**：资产管理（角色/场景/外观等）的业务逻辑层
- **文件数**：6 + 2 子目录（kinds/, services/）
- **评价**：结构合理，contracts + mappers + services 分层清晰。

#### `assistant-platform/` ✅
- **功能**：AI 助手平台（技能注册 + 运行时 + 系统提示词）
- **文件数**：7 + 1 子目录（skills/）
- **评价**：模块化良好。

#### `async/` 🟡
- **功能**：仅一个并发控制工具 `map-with-concurrency.ts`
- **问题**：单文件目录。可合并到通用 `utils/`，或与顶层的 `async-*.ts` 整合。

#### `billing/` ✅
- **功能**：计费系统（费用计算、货币、账本、报表）
- **文件数**：12
- **评价**：完整且自洽的模块，有独立的测试覆盖。

#### `contracts/` ✅
- **功能**：图片 URL 合约定义 + 测试
- **文件数**：2
- **评价**：正常。

#### `errors/` ✅
- **功能**：统一错误码体系
- **文件数**：6
- **评价**：模块本身组织良好，但外部有 3 个散落文件与之职责重叠（见 3.1 分析）。

#### `generators/` 🟡
- **功能**：媒体生成器工厂（图片/视频/音频）
- **文件数**：11 + 3 子目录

**问题**：
- 顶层有 `ark.ts`、`fal.ts`、`minimax.ts`、`official.ts`、`vidu.ts` 等 provider-specific 视频生成器，但子目录 `video/` 中又有 `google.ts`、`openai-compatible.ts`。
- 同样，`image/` 子目录有 `google.ts`、`openai-compatible.ts`、`gemini-compatible.ts`，但顶层没有对应的 provider 文件——不一致。
- **建议**：所有 provider 的视频生成器统一放入 `video/`，图片生成器统一放入 `image/`。

#### `home/` 🟡
- **功能**：首页业务逻辑（创建项目、快速开始、默认路由）
- **文件数**：3
- **问题**：`home/` 作为 lib 子目录名称不直观——它是页面逻辑还是业务逻辑？与 `src/app/[locale]/home/` 有概念重叠。

#### `image-generation/` 🟡
- **功能**：图片生成计数/偏好管理
- **文件数**：5
- **问题**：包含一个 React Hook（`use-image-generation-count.ts`），但这是 `src/lib/` 目录——Hook 应在 `src/hooks/` 中。

#### `lipsync/` ✅
- **功能**：口型同步功能
- **文件数**：4（index, preprocess, types + providers/）
- **评价**：结构合理。

#### `llm/` ✅
- **功能**：LLM 调用核心（聊天补全、流式、视觉等）
- **文件数**：12 + providers/ 子目录
- **评价**：组织良好，有 index.ts 统一导出。

#### `llm-observe/` ✅
- **功能**：LLM 调用可观测性（任务流、阶段管道、流上下文）
- **文件数**：7
- **评价**：合理的横切关注点模块。

#### `logging/` ✅
- **功能**：统一日志系统（配置、上下文、文件写入、脱敏）
- **文件数**：7
- **评价**：完整且自洽。

#### `media/` ✅
- **功能**：媒体服务（图片 URL 处理、外发图片、附件、哈希）
- **文件数**：8（含 2 个测试文件）
- **评价**：正常，测试与实现共存是可接受的。

#### `migrations/` 🟡
- **功能**：仅一个文件 `gateway-route-openai-compat.ts`
- **问题**：`scripts/migrations/` 也有迁移脚本。同类代码分布在两处。

#### `model-capabilities/` ✅
- **功能**：模型能力目录（查询视频模型选项、有效能力等）
- **文件数**：4
- **评价**：与 `standards/capabilities/` JSON 配合使用，结构清晰。

#### `model-gateway/` ✅
- **功能**：模型网关路由（OpenAI 兼容协议转发）
- **文件数**：5 + openai-compat/ 子目录（8 文件）
- **评价**：模块化良好。

#### `model-pricing/` ✅
- **功能**：模型定价目录
- **文件数**：4
- **评价**：与 `standards/pricing/` 配合，结构清晰。

#### `novel-promotion/` 🟡
- **功能**：小说推广（故事→剧本→分镜的 AI 流水线）
- **文件数**：多层子目录
- **问题**：`stages/` 下有 `video-stage-runtime/`、`voice-stage-runtime/` 子目录加上顶层 `video-stage-runtime-core.tsx`、`voice-stage-runtime-core.tsx`，命名模式暗示了重构中间状态。

#### `prompt-i18n/` ✅
- **功能**：提示词国际化系统
- **文件数**：7
- **评价**：完整模块。

#### `providers/` 🟡
- **功能**：第三方 AI 提供商的 API 封装
- **子目录**：bailian/（12 文件）、fal/（1 文件）、official/（1 文件）、siliconflow/（8 文件）

**问题**：
- 提供商代码分布不均——bailian 有 12 个文件覆盖 image/video/audio/voice/tts/llm，而 fal 只有 1 个 `base-url.ts`（FAL 的真正逻辑在 `async-submit.ts` 和 `generators/fal.ts` 中散落）
- ARK（火山引擎）没有 `providers/ark/` 目录，代码散落在 `src/lib/ark-api.ts`、`ark-llm.ts`、`generators/ark.ts`、`llm/providers/ark.ts`
- Google 也没有统一目录，散落在 `generators/video/google.ts`、`generators/image/google.ts`、`async-task-utils.ts`
- **建议**：为每个 provider 建立完整的子目录（`providers/ark/`、`providers/google/`、`providers/fal/`），将散落的代码收拢。

#### `query/` ✅
- **功能**：React Query 客户端配置和 hooks
- **文件数**：5 + hooks/ + mutations/ 子目录
- **评价**：合理。

#### `run-runtime/` ✅
- **功能**：运行时工作流执行引擎
- **文件数**：6
- **评价**：合理。

#### `sse/` 🟡
- **功能**：SSE 共享订阅者
- **文件数**：1（`shared-subscriber.ts`）
- **问题**：单文件目录。

#### `storage/` ✅
- **功能**：对象存储抽象层（MinIO/S3/本地）
- **文件数**：9 + providers/ 子目录
- **评价**：良好的工厂模式。

#### `task/` ✅
- **功能**：任务系统核心（队列、状态、提交、发布、协调）
- **文件数**：16
- **评价**：文件数较多但各文件职责清晰。

#### `user-api/` ✅
- **功能**：用户 API（模型连接测试、协议探测）
- **文件数**：4 + model-template/ 子目录
- **评价**：合理。

#### `voice/` ✅
- **功能**：语音生成
- **文件数**：2
- **评价**：简洁。

#### `workflow-engine/` 🟡
- **功能**：工作流引擎依赖管理
- **文件数**：1（`dependencies.ts`）
- **问题**：单文件目录，且 `workflow-concurrency.ts` 在顶层。应合并。

#### `workspace/` 🟡
- **功能**：工作区模型设置
- **文件数**：1（`model-setup.ts`）
- **问题**：单文件目录。

---

## 四、`src/components/` 分析

### 4.1 目录结构

```
components/
├── ai-elements/       # AI 对话消息组件（4 文件）
├── assistant/          # AI 助手聊天（2 文件）
├── auth/              # 认证组件（1 文件）
├── image-generation/  # 图片生成 UI（2 文件）
├── llm-console/       # LLM 流式输出控制台（2 文件）
├── media/             # 媒体图片组件（2 文件）
├── providers/         # QueryProvider（1 文件）
├── selectors/         # 比例/风格选择器（1 文件）
├── shared/            # 共享组件 → assets/（子目录）
├── task/              # 任务状态组件（2 文件）
├── ui/                # UI 基础组件 ★
├── voice/             # 语音设计组件（3 文件）
├── ConfirmDialog.tsx  # 散落顶层
├── LanguageSwitcher.tsx
├── Navbar.tsx
├── ProgressToast.tsx
└── UpdateNoticeModal.tsx
```

### 4.2 发现的问题

#### 🟡 大量单文件/双文件子目录
`auth/`（1 文件）、`providers/`（1 文件）、`selectors/`（1 文件）、`llm-console/`（2 文件）、`media/`（2 文件）、`task/`（2 文件）——这些子目录的粒度过细，反而增加了导航成本。

#### 🟡 顶层散落 5 个组件文件
`ConfirmDialog.tsx`、`LanguageSwitcher.tsx`、`Navbar.tsx`、`ProgressToast.tsx`、`UpdateNoticeModal.tsx` 没有归入任何子目录，与已有的分组规则不一致。
- **建议**：归入 `ui/` 或 `shared/`。

#### 🟡 `ui/` 目录内混杂多种变体
- `model-dropdown-innovative.tsx`、`model-dropdown-ios.tsx`、`model-dropdown-variants.tsx`——3 个模型下拉菜单变体共存
- `select-variants.tsx`——选择器变体
- 这暗示了 A/B 测试或迭代过程中的实验代码未清理。

#### ✅ `ui/primitives/` 和 `ui/patterns/`
Glass 设计系统原语（GlassButton、GlassSurface 等）和复合模式（PanelCard、StoryboardHeader）的分层是合理的。

---

## 五、`src/app/` 分析

### 5.1 `src/app/api/` API 路由

```
api/
├── admin/              # 管理后台
├── asset-hub/          # 资产管理（20 个子目录）★
├── assets/             # 旧版资产 API？
├── auth/               # 认证
├── cos/                # COS 存储
├── files/              # 文件服务
├── novel-promotion/    # 小说推广
├── projects/           # 项目管理
├── runs/               # 运行管理
├── sse/                # 服务端推送
├── storage/            # 存储签名
├── system/             # 系统 API
├── task-target-states/ # 任务目标状态
├── tasks/              # 任务管理
├── user/               # 用户管理
└── user-preference/    # 用户偏好
```

#### 🔴 `asset-hub/` 目录有 20 个子目录
这是 API 路由中最膨胀的目录。每个操作都有独立的路由目录（`ai-design-character/`、`ai-modify-character/`、`ai-design-location/`、`ai-modify-location/`、`generate-image/`、`modify-image/`、`voice-design/` 等）。

**问题**：
- 遵循 RESTful 的话，很多操作可以合并——如 `ai-design-character/` 和 `ai-modify-character/` 可以统一为 `characters/` 下的不同 action
- 与 `assets/` 目录可能存在功能重叠

#### 🟡 `cos/` 路由
`.env.example` 注释说 COS 是"预留 provider（当前版本未实现）"，但 API 路由已存在。可能是死代码。

### 5.2 `src/app/[locale]/` 页面路由
```
[locale]/
├── auth/       # 登录注册
├── dev/        # 开发者工具
├── home/       # 首页
├── profile/    # 个人资料
├── workspace/  # 工作区（核心页面）
├── layout.tsx
├── page.tsx
└── providers.tsx
```
- **评价**：页面路由组织合理，符合 Next.js App Router 约定。

### 5.3 `src/app/m/` 移动端/公开访问
- 只有 `[publicId]/`，用于公开分享的媒体访问。
- **评价**：合理。

---

## 六、`src/features/` 分析

### 6.1 `video-editor/` ✅
```
video-editor/
├── components/  # Preview, Timeline, TransitionPicker, Stage
├── hooks/       # useEditorActions, useEditorState
├── remotion/    # VideoComposition, transitions/
├── types/       # editor.types.ts
├── utils/       # migration.ts, time-utils.ts
└── index.ts
```

**评价**：这是整个项目中**组织最好的模块**。它遵循了 feature-first 架构：
- 组件、hooks、类型、工具函数自成体系
- 使用 Remotion 做视频合成
- 有独立的 index.ts 导出

**问题**：`features/` 只有这一个模块。按照此模式，`novel-promotion/`、`assistant-platform/` 等也应该是 feature 模块，但它们在 `src/lib/` 中。这说明项目在架构风格上不统一——`video-editor` 是后来按新模式写的。

---

## 七、`src/hooks/` 分析

```
hooks/
└── common/
    ├── useCandidateSystem.ts
    └── useGithubReleaseUpdate.ts
```

#### 🟡 问题
- 只有 `common/` 一个子目录，仅 2 个 hook
- `src/lib/image-generation/use-image-generation-count.ts` 是一个 React Hook 但放在 lib 里
- `src/components/assistant/useAssistantChat.ts` 是一个 Hook 但放在 components 里
- Hook 的存放位置不统一

---

## 八、`src/types/` 分析

```
types/
├── character-profile.ts
├── next-auth.d.ts
├── project.ts
└── storyboard-types.ts
```

#### 🟡 问题
- `next-auth.d.ts` 是 Next-Auth 的类型扩展声明文件，与业务类型混放
- 业务类型（如 `project.ts`、`storyboard-types.ts`）也可考虑就近放置到使用它们的模块中
- 但作为全局共享类型集中存放也是可接受的方案

---

## 九、`src/i18n/` 分析

```
i18n/
├── navigation.ts
└── routing.ts
+ src/i18n.ts  (顶层)
```

- **评价**：简单清晰。`routing.ts` 定义语言和路由配置，`navigation.ts` 导出导航工具。

---

## 十、`src/styles/` 分析

```
styles/
├── animations.css
├── ui-semantic-glass.css
└── ui-tokens-glass.css
+ src/app/globals.css  (全局样式)
```

- **评价**：Glass 设计系统的 CSS token 和语义层分离合理。
- **注意**：`globals.css` 在 `app/` 下而非 `styles/` 下，但这是 Next.js 的约定。

---

## 十一、`src/contexts/` 分析

```
contexts/
└── ToastContext.tsx
```

- **评价**：仅 1 个 Context，合理。如果未来增长可与 `providers/` 合并。

---

## 十二、`src/lib/workers/` 分析

### 12.1 结构

```
workers/
├── handlers/  # 任务处理器（45 个文件）★
├── image.worker.ts
├── index.ts
├── shared.ts
├── text.worker.ts
├── user-concurrency-gate.ts
├── utils.ts
├── video.worker.ts
└── voice.worker.ts
```

### 12.2 问题

#### 🔴 `handlers/` 目录有 45 个文件，全部平铺在一层
这是项目中**文件数最多的单层目录**。文件按 handler 功能命名（如 `shot-ai-prompt-appearance.ts`、`shot-ai-prompt-location.ts`、`shot-ai-prompt-runtime.ts`、`shot-ai-prompt-shot.ts`、`shot-ai-prompt-utils.ts`、`shot-ai-prompt.ts`），但没有按功能分组。

**命名模式分析**：
- `analyze-global-*`：4 个文件（parse, persist, prompt, 主文件）
- `shot-ai-*`：9 个文件
- `image-task-*` / `*-image-task-*`：7 个文件
- `script-to-storyboard*`：3 个文件
- `story-to-script*`：2 个文件
- `voice-*`：3 个文件
- `screenplay-*`：2 个文件
- `character-*` / `reference-to-character*`：4 个文件

**建议**：按功能分组为子目录：
```
handlers/
├── analysis/        # analyze-global-*, analyze-novel
├── shot-ai/         # shot-ai-*
├── image-tasks/     # *-image-task-handler*
├── script/          # script-to-storyboard*, story-to-script*
├── screenplay/      # screenplay-*
├── character/       # character-*, reference-to-character*
├── voice/           # voice-*, voice-design
├── llm/             # llm-proxy, llm-stream
└── misc/            # clips-build, episode-split, modify-description-sync
```

---

## 十三、`lib/` 目录（根目录下的 lib/，非 src/lib/）

```
lib/
└── prompts/
    ├── character-reference/
    ├── novel-promotion/
    ├── skills/
    └── proxy.ts
```

#### 🔴 与 `src/lib/` 路径混淆
项目同时有 **根目录的 `lib/`** 和 **`src/lib/`**。根目录的 `lib/prompts/` 存放提示词模板和一个代理设置函数（`proxy.ts`），但 `src/lib/prompt-i18n/` 也在处理提示词。

**问题**：
- `proxy.ts` 是一个设置网络代理的函数，与 `prompts/` 毫无关系
- 提示词模板散在两处（`lib/prompts/` 和 `src/lib/prompt-i18n/`）
- **建议**：将 `lib/prompts/` 移到 `src/lib/prompts/` 下统一管理；`proxy.ts` 移到 `src/lib/` 下。

---

## 十四、`scripts/` 分析

### 14.1 结构

```
scripts/
├── guards/           # 代码守卫脚本（29 个文件）
├── migrations/       # 数据迁移脚本（7 + reports/）
├── check-*.ts/mjs    # 检查脚本（~15 个）
├── migrate-*.ts/sh   # 迁移脚本（~6 个）
├── media-*.ts        # 媒体备份/归档脚本（~6 个）
├── billing-*.ts      # 计费脚本（2 个）
├── test-*.ts/sh      # 测试辅助脚本（~5 个）
├── tmp-*.mjs         # 临时脚本（2 个）
├── watchdog.ts       # 任务看门狗
├── bull-board.ts     # 任务管理面板
└── diagnose-project.ts
```

### 14.2 问题

#### 🟡 `guards/` 有 29 个文件全部平铺
守卫脚本功能各异（API 合约、测试覆盖、任务状态、提示词校验、模型配置等），全部放在一个目录。可按领域分组。

#### 🟡 迁移脚本散在两处
- `scripts/migrate-*.ts`（顶层）：旧的迁移脚本
- `scripts/migrations/`（子目录）：新的迁移脚本
- 两者并存说明组织方式在演进过程中不一致。
- **建议**：统一移入 `scripts/migrations/`。

#### 🟡 `tmp-*.mjs` 临时脚本
`tmp-cleanup-project-models.mjs` 和 `tmp-find-old-model.mjs` 是临时脚本，应在完成使命后删除。

#### 🟡 混合使用 `.ts` 和 `.mjs`
检查/守卫脚本混合使用 `.ts`（通过 tsx 运行）和 `.mjs`（直接 node 运行），技术栈不统一。

---

## 十五、`prisma/` 分析

```
prisma/
├── migrations/       # 数据库迁移记录
├── schema.prisma     # 主 schema
└── schema.sqlit.prisma  # SQLite schema（备用/开发用）
```

#### 🟡 双 schema 文件
- `schema.prisma`（MySQL）和 `schema.sqlit.prisma`（SQLite）共存
- 实际使用的是 MySQL，SQLite schema 是历史残留或开发便利方案
- **建议**：如不再使用 SQLite，删除 `schema.sqlit.prisma`。

---

## 十六、`tests/` 分析

```
tests/
├── concurrency/   # 并发测试
├── contracts/     # 合约测试
├── fixtures/      # 测试数据
├── helpers/       # 测试工具
├── hidden/        # 隐藏测试？
├── integration/   # 集成测试
├── regression/    # 回归测试
├── setup/         # 测试环境设置
├── system/        # 系统测试
└── unit/          # 单元测试（30+ 子目录）
```

#### ✅ 测试组织整体良好
- 清晰的层级划分（unit/integration/system/regression/concurrency）
- 有完整的 fixtures 和 helpers 支持
- `setup/` 包含全局初始化/清理

#### 🟡 `hidden/` 目录
名称不直观——它存放什么？需要确认是否是被故意排除的测试。

#### 🟡 测试文件也出现在 `src/lib/` 中
- `src/lib/media/image-url.test.ts` 和 `outbound-image.test.ts`
- `src/lib/contracts/image-urls-contract.test.ts`
- 与 `tests/` 目录的分离原则不一致。

---

## 十七、`messages/` 分析

```
messages/
├── en/  # 英文（31 个 JSON 文件）
└── zh/  # 中文（31 个 JSON 文件）
```

#### ✅ 良好
- 中英文对称，31 个文件一一对应
- 按功能领域拆分（auth, billing, storyboard, voice 等）
- 与 next-intl 框架配合

---

## 十八、`standards/` 分析

```
standards/
├── capabilities/    # 模型能力目录 JSON
├── pricing/         # 模型定价 JSON
└── prompt-canary/   # 提示词金丝雀测试
```

#### ✅ 良好
用于静态检查和守卫脚本的标准数据。与 `src/lib/model-capabilities/` 和 `src/lib/model-pricing/` 配合使用。

---

## 十九、`docs/` 分析

```
docs/
├── cosyvoice_usage.md
├── cy.md
├── qwen3tts_introduce.md
└── qwen3tts_usage.md
```

#### 🟡 轻微问题
- `cy.md` 命名不直观（应该是 CosyVoice 的缩写？）
- 仅 4 个文档且都是 TTS 相关，其他功能（视频生成、计费、部署）缺乏文档

---

## 二十、`public/` 和 `images/` 分析

### `public/` ✅
Next.js 静态资源目录，包含 logo、图标、SVG。正常。

### `images/` 🟡
根目录下的 `images/` 包含 2 个图片文件（`cta-banner.png` 和一个哈希命名的 jpg）。与 `public/images/` 功能重叠。
- **建议**：合并到 `public/images/` 或删除。

---

## 二十一、`.github/` 分析

```
.github/
└── workflows/
    └── docker-publish.yml
```

#### ✅ 正常
仅一个 Docker 发布工作流。

---

## 二十二、`.husky/` 分析

```
.husky/
├── _/
├── pre-commit
└── pre-push
```

#### ✅ 正常
Git hooks 配置，配合 `prepare` 脚本使用。

---

## 二十三、`.tmp/` 和 `logs/` 分析

### `.tmp/` ✅
空的临时目录。

### `logs/` 🟡
包含 `admin_test.log`、`app.log`、`Internal_test.log`。
- 日志文件应在 `.gitignore` 中（检查是否已包含）。
- 命名不一致：`admin_test.log`（下划线）vs `Internal_test.log`（大驼峰+下划线）。

---

## 二十四、`src/lib/constants.ts` 分析

#### 🔴 硬编码模型列表与配置中心矛盾

`constants.ts` 硬编码了大量模型列表：
- `ANALYSIS_MODELS`：5 个分析模型
- `IMAGE_MODELS`：2 个图片模型
- `IMAGE_MODEL_OPTIONS`：9 个图片模型选项
- `VIDEO_MODELS`：14 个视频模型
- `SEEDANCE_BATCH_MODELS`：4 个批量模型
- `FIRST_LAST_FRAME_MODELS`：8 个首尾帧模型
- `TTS_VOICES`：4 个 TTS 声音

**问题**：
- 项目有 `model-capabilities/catalog.ts` + `standards/capabilities/` 作为能力权威来源
- 项目有 `model-pricing/catalog.ts` + `standards/pricing/` 作为定价权威来源
- 项目有守卫脚本 `check:no-hardcoded-model-capabilities` 检查硬编码
- 但 `constants.ts` 仍然硬编码了大量模型信息——这些是否已被标记为"静态兜底"？
- 注释写了"能力权威来源是 standards/capabilities；此常量仅作静态兜底展示"，说明系统在过渡中

---

---

## 二十五、`src/` 结构松散化深度诊断与模块化拆分方案

### 25.1 量化现状

| 区域 | 文件数 | 问题 |
|------|--------|------|
| `src/` 总计 | **894** 个 .ts/.tsx 文件 | — |
| `src/lib/` | **399** 个（占 44.6%）| 核心重灾区 |
| `src/lib/` 顶层散落 | **41** 个文件 | 无归属 |
| `src/lib/` 子目录数 | **33** 个 | 类型混杂 |
| `src/lib/workers/handlers/` | **46** 个平铺 | 无分组 |
| `src/lib/query/` | **58** 个 | React Hook 混入 lib |
| `src/app/` | **396** 个 | 较合理 |
| `src/components/` | **72** 个 | 轻度松散 |

**结论：`src/lib/` 独占 44.6% 的源码文件——它就是整个项目的结构性瓶颈。**

### 25.2 根因分析：为什么 `src/lib/` 成了万能抽屉

```
问题根因链：
  
项目从 Next.js 约定出发
 → "不是页面(app/)就是库(lib/)"的二分法
 → 所有后端逻辑、前端 hooks、工具函数、Provider 封装全部涌入 lib/
 → 新增功能时"先扔 lib/ 再说"
 → 目录爆炸后按子功能建子目录，但顶层散落文件来不及搬
 → 同一领域的代码散落在 3-4 个位置
```

这不是"没分目录"的问题，而是**缺乏除 app/lib 之外的第三层架构语义**。

### 25.3 项目真实的功能领域（通过代码反推）

经过完整代码阅读，项目的业务可以拆分为以下 **8 个领域**（Domain）：

```
┌─────────────────────────────────────────────────────────────────┐
│                    waoowaoo 功能领域图                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ① AI Provider Layer（AI 提供商接入层）                           │
│     ARK · FAL · Google · MiniMax · Vidu · 百炼 · 硅基流动         │
│     · OpenAI-Compat · OpenRouter                                │
│                                                                 │
│  ② Media Generation（媒体生成引擎）                               │
│     图片生成 · 视频生成 · 音频/TTS · 口型同步                       │
│     异步任务提交/轮询 · 生成器工厂                                  │
│                                                                 │
│  ③ LLM Runtime（大模型推理运行时）                                 │
│     Chat Completion · Streaming · Vision                        │
│     Model Gateway · Responses API · 推理观测                      │
│                                                                 │
│  ④ Task System（任务调度系统）                                     │
│     BullMQ 队列 · Worker · Watchdog · 状态机 · SSE               │
│     46 个 handler（分镜/角色/语音/视频/LLM代理等）                  │
│                                                                 │
│  ⑤ Content Pipeline（内容生产流水线）                              │
│     小说→剧本 · 剧本→分镜 · 分镜图生成 · 语音合成 · 视频合成        │
│     角色分析 · 场景分析 · 全局分析                                  │
│                                                                 │
│  ⑥ Asset Management（资产管理）                                   │
│     角色库 · 场景库 · 道具库 · 语音库 · 文件夹                      │
│     Asset Hub UI · 全局/项目资产                                  │
│                                                                 │
│  ⑦ Platform Infrastructure（平台基础设施）                         │
│     认证 · 计费 · 存储(MinIO/S3) · 日志 · 数据库                   │
│     错误处理 · 配置中心 · 国际化 · 加密                             │
│                                                                 │
│  ⑧ Workspace UI（工作区前端）                                     │
│     项目管理 · 分镜编辑器 · 视频编辑器 · 进度展示                    │
│     AI 助手 · React Query 数据层                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 25.4 当前代码散布地图（同一领域代码散落在多少处）

以 **"AI Provider（ARK 火山引擎）"** 为例，追踪它的代码分布：

```
ARK 相关代码散落在 7 个位置：

src/lib/ark-api.ts              ← 顶层散落（REST API, 540 行）
src/lib/ark-llm.ts              ← 顶层散落（Responses API, 339 行）
src/lib/generators/ark.ts       ← generators 子目录（生成器类）
src/lib/llm/providers/ark.ts    ← llm 子目录（仅 re-export）
src/lib/async-submit.ts         ← 顶层散落（queryArkVideoStatus）
src/lib/async-task-utils.ts     ← 顶层散落（querySeedanceVideoStatus，同一 API）
src/lib/async-poll.ts           ← 顶层散落（pollArkTask，引用前两者）
```

以 **"错误处理"** 为例：

```
错误处理代码散落在 6 个位置：

src/lib/errors/               ← 子目录（6 文件，统一错误码）
src/lib/api-errors.ts         ← 顶层散落（ApiError 类 + apiHandler, 569 行）
src/lib/error-handler.ts      ← 顶层散落（客户端 API 错误处理）
src/lib/error-utils.ts        ← 顶层散落（abort 检测 + safeAlert）
src/lib/prisma-error.ts       ← 顶层散落（Prisma 错误判断）
src/lib/prisma-retry.ts       ← 顶层散落（Prisma 重试）
```

以 **"React Hooks / 客户端数据层"** 为例：

```
React Hooks 散落在 5 个位置：

src/hooks/common/                          ← 全局 hooks（2 个）
src/lib/query/hooks/                       ← lib 中（15+ 个 hook 文件）
src/lib/query/mutations/                   ← lib 中（30 个 mutation hook 文件）
src/lib/image-generation/use-*             ← lib 中（1 个 hook）
src/components/assistant/useAssistantChat  ← 组件中（1 个 hook）
src/app/[locale]/workspace/[projectId]/hooks/  ← 页面路由中
```

### 25.5 解耦与模块化拆分方案

#### 目标架构

```
src/
├── app/                    # Next.js 路由层（页面 + API routes）—— 保持不变
│
├── modules/                # ★ 新增：按领域组织的业务模块
│   ├── providers/          # ① AI 提供商接入层
│   ├── media-gen/          # ② 媒体生成引擎
│   ├── llm/                # ③ 大模型推理运行时
│   ├── task-system/        # ④ 任务调度系统
│   ├── content-pipeline/   # ⑤ 内容生产流水线
│   └── asset-mgmt/         # ⑥ 资产管理
│
├── infra/                  # ★ 新增：平台基础设施（⑦）
│   ├── auth/
│   ├── billing/
│   ├── db/
│   ├── storage/
│   ├── logging/
│   ├── errors/
│   ├── config/
│   └── i18n/
│
├── ui/                     # ★ 重组：前端 UI 层（⑧）
│   ├── components/         # 通用 UI 组件
│   ├── hooks/              # 通用 hooks
│   ├── contexts/           # React Context
│   ├── styles/             # CSS
│   └── assets/             # 字体等静态资源
│
├── features/               # 自洽的 feature 模块（已有 video-editor）
│   └── video-editor/
│
└── shared/                 # 真正的跨领域共享工具
    ├── types/
    ├── constants.ts
    └── utils/
```

#### 各模块详细拆分映射

---

**① `modules/providers/` — AI 提供商接入层**

每个 provider 一个子目录，收拢所有散落代码：

```
modules/providers/
├── ark/                    ← 合并 ark-api.ts + ark-llm.ts + generators/ark.ts + llm/providers/ark.ts
│   ├── api.ts                 (REST 图片/视频 API)
│   ├── llm.ts                 (Responses API + streaming)
│   ├── image-generator.ts     (ImageGenerator 实现)
│   ├── video-generator.ts     (VideoGenerator 实现)
│   ├── poll.ts                (从 async-poll.ts 拆出 pollArkTask)
│   └── types.ts
│
├── fal/                    ← 合并 providers/fal/base-url.ts + generators/fal.ts + async-submit 中 FAL 部分
│   ├── base-url.ts
│   ├── submit.ts              (submitFalTask)
│   ├── poll.ts                (queryFalStatus + pollFalTask)
│   ├── image-generator.ts
│   └── video-generator.ts
│
├── google/                 ← 合并 generators/image/google.ts + video/google.ts + async-task-utils 中 Gemini/Veo
│   ├── gemini-image.ts
│   ├── imagen.ts
│   ├── veo-video.ts
│   ├── batch.ts               (gemini-batch-utils.ts)
│   └── poll.ts
│
├── bailian/                ← 保持 providers/bailian/ 结构（已较完整）
├── siliconflow/            ← 保持 providers/siliconflow/ 结构
├── minimax/                ← 从 generators/minimax.ts + async-poll 中拆出
├── vidu/                   ← 从 generators/vidu.ts + async-poll 中拆出
├── openai-compat/          ← model-gateway/openai-compat/ + openai-compat-*.ts
│
├── registry.ts             ← 生成器工厂 (原 generators/factory.ts)
├── poll-router.ts          ← 统一轮询路由 (原 async-poll.ts 的 switch 逻辑，~50 行)
└── types.ts                ← 统一接口 (原 generators/base.ts)
```

**收益**：
- "ARK 出 bug → 去 `modules/providers/ark/`" 直觉导航
- async-poll.ts 从 980 行→poll-router.ts ~50 行（纯路由分发）
- 每个 provider 自行管理自己的提交/轮询/生成逻辑

---

**② `modules/media-gen/` — 媒体生成引擎**

```
modules/media-gen/
├── image/
│   ├── generate.ts            (原 generator-api.ts 中 generateImage)
│   ├── count.ts               (原 image-generation/ 下的计数逻辑)
│   ├── slot-state.ts
│   └── location-slots.ts
│
├── video/
│   └── generate.ts            (原 generator-api.ts 中 generateVideo)
│
├── audio/
│   └── generate.ts            (原 generator-api.ts 中 generateAudio)
│
├── lipsync/                   (原 lipsync/ 整体搬入)
│
├── media-service.ts           (原 media/service.ts)
├── image-url.ts               (原 media/image-url.ts)
├── outbound-image.ts          (原 media/outbound-image.ts)
└── types.ts
```

---

**③ `modules/llm/` — 大模型推理运行时**

```
modules/llm/
├── core/                      (原 llm/ 下 chat-completion, chat-stream, vision 等)
│   ├── chat-completion.ts
│   ├── chat-stream.ts
│   ├── vision.ts
│   ├── stream-helpers.ts
│   └── types.ts
│
├── gateway/                   (原 model-gateway/ 整体搬入)
│   └── openai-compat/
│
├── observe/                   (原 llm-observe/ 整体搬入)
│
├── ai-runtime/                (原 ai-runtime/ 整体搬入)
│
├── capabilities/              (原 model-capabilities/)
├── pricing/                   (原 model-pricing/)
├── prompt-i18n/               (原 prompt-i18n/)
│
├── assistant/                 (原 assistant-platform/ 整体搬入)
│
└── client.ts                  (原 llm-client.ts，re-export 入口)
```

---

**④ `modules/task-system/` — 任务调度系统**

```
modules/task-system/
├── core/                      (原 task/ 整体搬入)
│   ├── service.ts
│   ├── state-service.ts
│   ├── submitter.ts
│   ├── publisher.ts
│   ├── queues.ts
│   └── types.ts
│
├── workers/
│   ├── image.worker.ts
│   ├── video.worker.ts
│   ├── voice.worker.ts
│   ├── text.worker.ts
│   ├── shared.ts
│   └── utils.ts
│
├── handlers/                  ★ 按功能分组
│   ├── analysis/              (analyze-global-*, analyze-novel)
│   │   ├── parse.ts
│   │   ├── persist.ts
│   │   ├── prompt.ts
│   │   └── index.ts
│   ├── shot-ai/               (shot-ai-*)
│   │   ├── prompt.ts
│   │   ├── prompt-appearance.ts
│   │   ├── prompt-location.ts
│   │   ├── prompt-shot.ts
│   │   ├── prompt-utils.ts
│   │   ├── tasks.ts
│   │   ├── persist.ts
│   │   ├── variants.ts
│   │   └── runtime.ts
│   ├── image-gen/             (*-image-task-handler*)
│   │   ├── panel.ts
│   │   ├── character.ts
│   │   ├── location.ts
│   │   ├── asset-hub.ts
│   │   ├── modify.ts
│   │   ├── shared.ts
│   │   └── core.ts
│   ├── script/                (script-to-storyboard*, story-to-script*)
│   ├── character/             (character-profile*, reference-to-character*)
│   ├── voice/                 (voice-analyze*, voice-design)
│   ├── screenplay/            (screenplay-convert*)
│   └── misc/                  (clips-build, episode-split, llm-proxy, llm-stream)
│
├── sse/                       (原 sse/shared-subscriber.ts)
│   └── shared-subscriber.ts
│
└── watchdog.ts                (原 scripts/watchdog.ts 的核心逻辑)
```

**收益**：46 个平铺 handler → 8 个子目录，按功能域直觉导航。

---

**⑤ `modules/content-pipeline/` — 内容生产流水线**

```
modules/content-pipeline/
├── novel-promotion/           (原 novel-promotion/ 整体搬入)
│   ├── story-to-script/
│   ├── script-to-storyboard/
│   ├── stages/
│   ├── run-stream/
│   ├── insert-panel.ts
│   └── panel-ai-data-sync.ts
│
├── workflow/                  (原 run-runtime/ + workflow-engine/)
│   ├── service.ts
│   ├── publisher.ts
│   ├── workflow.ts
│   ├── lease.ts
│   ├── dependencies.ts        (原 workflow-engine/dependencies.ts)
│   └── concurrency.ts         (原 workflow-concurrency.ts)
│
├── storyboard-phases.ts       (原散落顶层)
└── episode-marker-detector.ts (原散落顶层)
```

---

**⑥ `modules/asset-mgmt/` — 资产管理**

```
modules/asset-mgmt/
├── core/                      (原 assets/ 整体搬入)
│   ├── kinds/
│   ├── services/
│   ├── contracts.ts
│   └── mappers.ts
│
├── hub/                       (原 asset-utils/)
│   └── ai-design.ts
│
└── types.ts
```

---

**⑦ `infra/` — 平台基础设施**

```
infra/
├── auth/                      (原 auth.ts + api-auth.ts)
├── billing/                   (原 billing/ 整体)
├── db/                        (原 prisma.ts + prisma-error.ts + prisma-retry.ts + redis.ts)
├── storage/                   (原 storage/ 整体)
├── logging/                   (原 logging/ 整体)
├── errors/                    (合并 errors/ + api-errors 中的 ApiError + error-handler + error-utils)
│   ├── codes.ts
│   ├── types.ts
│   ├── normalize.ts
│   ├── api-error.ts           (ApiError 类)
│   ├── client-error.ts        (合并 error-handler + error-utils)
│   ├── display.ts
│   └── user-messages.ts
├── config/                    (合并 api-config.ts + config-service.ts + model-config-contract.ts + env.ts + constants.ts)
│   ├── model-config.ts        (合并 api-config + config-service)
│   ├── contract.ts            (model-config-contract)
│   ├── env.ts
│   └── constants.ts
├── crypto/                    (原 crypto-utils.ts)
├── api/                       (原 api-errors.ts 中的 apiHandler + api-fetch.ts + rate-limit.ts)
│   ├── handler.ts             (apiHandler 包装器，从 api-errors.ts 拆出)
│   ├── fetch.ts
│   └── rate-limit.ts
└── i18n/                      (原 i18n/ + i18n.ts)
```

---

**⑧ `ui/` — 前端 UI 层重组**

```
ui/
├── components/                (原 components/ 结构基本保持，合并散落文件)
│   ├── ai-elements/
│   ├── assistant/
│   ├── image-generation/
│   ├── media/
│   ├── task/
│   ├── voice/
│   ├── layout/                ★ 新增：收纳 Navbar, LanguageSwitcher, ProgressToast 等
│   └── primitives/            (原 ui/primitives/)
│
├── hooks/                     (统一所有 React Hooks)
│   ├── query/                 ★ 原 lib/query/hooks/ 整体搬入
│   ├── mutations/             ★ 原 lib/query/mutations/ 整体搬入
│   ├── common/                (原 hooks/common/)
│   └── image-generation/      (原 lib/image-generation/use-*.ts)
│
├── contexts/                  (原 contexts/)
├── styles/                    (原 styles/)
├── assets/                    (原 assets/)
└── query-client.ts            (原 lib/query/client.ts + keys.ts)
```

**收益**：React Hooks 不再混在 lib/ 中——"要找 Hook 去 ui/hooks/"，零歧义。

---

### 25.6 依赖规则（防止倒退）

```
依赖方向（只允许向下依赖，禁止反向）：

    app/  ──→  modules/  ──→  infra/
      │           │              │
      └──→  ui/  ─┘              │
              │                  │
              └──→  shared/ ←────┘

规则：
1. app/ 路由层可以导入 modules/ 和 ui/
2. modules/ 可以导入 infra/ 和 shared/，模块间可有受限依赖
3. ui/ 可以导入 modules/ 的类型和 shared/
4. infra/ 只能导入 shared/，不能导入 modules/ 或 ui/
5. shared/ 不导入任何上层模块
```

### 25.7 渐进式迁移路径（避免一次性大重构）

```
Phase 1（1-2 周）：最小侵入，消灭散落文件
├── 创建 infra/ 和 modules/providers/
├── 移动 41 个散落文件 → 按映射表归入对应目录
├── 只改 import 路径，不改任何业务逻辑
├── 删除死代码（src/middleware.ts, src/pages/）
└── tsconfig paths 添加 @infra/*, @modules/* 别名

Phase 2（2-3 周）：handlers 分组 + hooks 迁移
├── workers/handlers/ 按功能拆子目录
├── query/hooks/ 和 mutations/ 搬到 ui/hooks/
└── components/ 散落文件归类

Phase 3（3-4 周）：Provider 收拢
├── 每个 provider 建立完整子目录
├── async-poll.ts 瘦身为路由分发
├── 合并 api-config + config-service
└── 拆分 api-errors.ts

Phase 4（后续）：Feature 化
├── 评估将 novel-promotion 升级为 feature 模块
├── 评估将 asset-mgmt 升级为 feature 模块
└── 补充守卫脚本确保架构边界
```

### 25.8 拆分前后对比

| 指标 | 当前 | 目标 |
|------|------|------|
| `src/lib/` 顶层散落文件 | 41 个 | **0 个**（目录删除） |
| handlers/ 最大平铺层 | 46 个文件 | **≤12 个/目录** |
| React Hook 存放位置 | 5 处 | **1 处**（ui/hooks/） |
| ARK 代码散落位置 | 7 处 | **1 处**（modules/providers/ark/） |
| 错误处理文件 | 10 个/6 处 | **7 个/1 处**（infra/errors/） |
| 配置读取入口 | 2 个（api-config + config-service） | **1 个**（infra/config/） |
| async-poll.ts 行数 | 980 行 | **~50 行**（纯路由） |
| "从哪找代码"的认知负担 | 高（需经验/全文搜索） | **低**（按领域直觉导航） |

---

## 总结：优先整改建议

### P0（必须修复）

1. **`src/lib/` 顶层 41 个散落文件归类整理**
   - 按上述映射表移入 `infra/` 和 `modules/` 对应子目录
   - 至少将错误处理、异步任务、ARK/Provider 相关的文件收拢

2. **`src/lib/workers/handlers/` 46 个文件按功能分组**
   - 建立 analysis/, shot-ai/, image-gen/, script/, character/, voice/ 等子目录

3. **删除死代码**
   - `src/middleware.ts`（与根目录重复）
   - `src/pages/_document.tsx`（Pages Router 残留）

### P1（强烈建议）

4. **Provider 代码收拢到 `modules/providers/` 目录**
   - 为 ARK、Google、FAL 各建子目录
   - 将散落的 `ark-api.ts`、`ark-llm.ts`、`gemini-batch-utils.ts` 等收拢

5. **错误处理体系统一到 `infra/errors/`**
   - 拆分 `api-errors.ts`（569 行）
   - 合并 `error-handler.ts` + `error-utils.ts`

6. **React Hooks 统一到 `ui/hooks/`**
   - `lib/query/hooks/`（15 文件）+ `lib/query/mutations/`（30 文件）搬出 lib
   - `lib/image-generation/use-*.ts` 搬出 lib

7. **统一迁移脚本位置**
   - `scripts/` 顶层的 `migrate-*.ts` 移入 `scripts/migrations/`
   - `src/lib/migrations/` 的唯一文件考虑移入 `scripts/migrations/`

8. **根目录 `lib/prompts/` 移入 `src/`**

9. **删除临时文件**
   - `.tmp_check_task.ts`、`debug-request.json`、`extract_chinese.py`
   - `scripts/tmp-*.mjs`

### P2（建议改善）

10. **统一包管理器**（删除多余的 lock 文件）
11. **`constants.ts` 硬编码模型列表迁移到配置中心**
12. **合并 `api-config.ts` + `config-service.ts` 为单一配置服务**
13. **`generators/` 目录内 provider 文件位置统一**
14. **组件目录中散落的 5 个顶层文件归类**
15. **根目录 `images/` 合并到 `public/images/`**
16. **`.mjs` 和 `.ts` 脚本格式统一**
17. **建立 tsconfig paths 别名**（`@modules/*`, `@infra/*`, `@ui/*`）强化架构边界
