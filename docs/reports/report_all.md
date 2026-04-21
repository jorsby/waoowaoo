# waoowaoo 代码库全面分析报告

本报告旨在全面分析 waoowaoo 代码库的目录结构、代码组织、潜在的重叠冗余和架构问题。重点关注代码是否符合简洁、精炼、直观的标准，并指出需要优化或重写的部分。

## 1. 项目根目录分析

**功能/用法**：根目录包含项目配置文件、依赖声明、Docker配置、CI/CD配置等，是整个项目的顶层结构配置中心。

**分析**：
*   **正常部分**：`.gitignore`, `package.json`, `tsconfig.json`, `next.config.ts`, `docker-compose.yml`, `eslint.config.mjs`, `vitest.config.ts` 等常见配置文件的存在是标准的现代前端/全栈工程结构，无过多冗余。
*   **潜在问题与不一致性**：
    *   **配置文件过多**：有 `.env`, `.env.example`, `caddyfile`, `docker-compose.yml`, `docker-compose.test.yml`, `Dockerfile` 等。对于基础设施配置，目前还算清晰，但需要注意环境配置的管理是否分散。
    *   **临时或冗余文件**：根目录下出现了 `.tmp_check_task.ts`，这明显是一个临时调试脚本，不应留存在根目录下被提交入库。`extract_chinese.py` 放在根目录，这是一个多语言处理的单一脚本，通常应该放到 `scripts/` 中。
    *   `report.md` 和 `report_all.md`：根目录出现了多个分析或测试报告文件，容易造成混乱，应归档至 `docs/` 或加入 `.gitignore`。
    *   包含了 `next-env.d.ts` 和 `middleware.ts`。其中 `middleware.ts` 既在根目录，又在 `src/middleware.ts` 中出现（如果存在），需要确认是否重复。
*   **建议**：清理 `.tmp_check_task.ts` 和杂乱的报告文件；将 `extract_chinese.py` 移动到 `scripts/` 下；梳理根目录，保持只有全局必需的工程化配置文件。

## 2. docs/ 及 images/ 目录

**功能/用法**：
*   `docs/`：存放项目的技术文档、设计说明等。
*   `images/`：似乎存放了一些如 `cta-banner.png` 等不属于 `public/` 的图片文件。

**分析**：
*   **潜在问题**：静态资源通常应统一放在 `public/` 目录下（如 `public/images/`），独立于 `public/` 之外再存在一个 `images/` 目录会导致资源管理不一致，使得开发人员不清楚何时该用 `public/`，何时用根目录的 `images/`（如果是文档引用的图片，最好放在 `docs/images/` 中）。
*   **建议**：合并 `images/` 下的资源到 `public/images/` 或 `docs/images/`，消除顶级 `images/` 目录。

## 3. lib/ 目录 (根目录)

**功能/用法**：包含了 `prompts/` 子目录，里面有 `proxy.ts`, `character-reference/`, `novel-promotion/`, `skills/` 等，用于管理 AI 的提示词和 Prompt 模版。

**分析**：
*   **架构重叠问题**：根目录下有 `lib/`，而 `src/` 目录下也有 `src/lib/`。在 Next.js 或前端工程中，通常应该只有 `src/lib/` 或者 `lib/`，二者同时存在会引起严重的直觉混乱（“我想加一个通用的工具函数，该放根目录 `lib/` 还是 `src/lib/`？”）。
*   **功能混杂**：根目录的 `lib/` 似乎被特定用于“提示词” (prompts)，这就使得它不是一个 general 的 library 目录，而是一个业务特性相关的目录。
*   **建议**：将根目录的 `lib/prompts/` 整体迁移至 `src/lib/prompts/` 或者 `src/features/ai-prompts/` 下，彻底删除根目录的 `lib/` 文件夹。


## 4. messages/ 目录

**功能/用法**：存放基于 next-intl 等多语言库（i18n）的 JSON 翻译文件，分为 `en/` 和 `zh/` 子目录。包含大量模块化的翻译 JSON。

**分析**：
*   **代码文件过多**：每个语言文件夹下有接近 30 个 `.json` 文件（例如 `actions.json`, `apiConfig.json`, `workspace.json`, `storyboard.json` 等）。
*   **冗余与可维护性问题**：大量的细碎 JSON 文件增加了维护负担。每次添加新翻译都要在对应的文件中寻找，如果文件过多且功能类似，容易导致重复定义。例如 `assetHub.json`, `assetLibrary.json`, `assetModal.json`, `assetPicker.json`, `assets.json` 这五个文件都跟 Asset (资产) 有关，被拆分得过于细碎。
*   **建议**：应该进行**功能域合并**。可以考虑把高度相关的 JSON 文件合并，比如将关于 Asset 的这五个文件合并成一个大的 `assets.json`；将 `layout.json` 和 `nav.json` 等与全局 UI 相关的合并为 `common.json` 内部的结构。降低文件数量，按“大模块”（Domain）划分（例如：`common`, `workspace`, `assets`, `ai`, `billing`），避免“按组件”建立文件导致目录爆炸。

## 5. prisma/ 目录

**功能/用法**：存放 Prisma ORM 的配置文件、数据模型 schema 定义以及数据库 migrations。

**分析**：
*   **正常情况**：有 `migrations/` 目录和 `schema.prisma`。
*   **潜在问题**：存在两个 schema 文件：`schema.prisma` (39KB) 和 `schema.sqlit.prisma` (31KB)。
    *   39KB的 schema 是非常巨大的！这说明系统里可能所有的业务领域模型都堆积在了一个巨大的文件里。虽然 Prisma 官方目前大部分情况下仍推荐单一文件，但维护起来很不直观。
    *   `schema.sqlit.prisma` 这个名字可能存在拼写错误（通常应该是 sqlite），这大概率是一个本地测试用的过度文件或者已废弃的备份。保留这样的历史测试文件会给接手者带来严重困扰（“我该改哪个 schema？”）。
*   **建议**：
    1.  确认 `schema.sqlit.prisma` 是否可以删除（如果是过时的）。
    2.  利用 Prisma 新版支持的 `prismaSchemaFolder` 特性（如果版本允许），将巨型的 `schema.prisma` 按照领域（Domains）拆分成多个 schema 文件（例如 `user.prisma`, `media.prisma`, `billing.prisma` 等），以提升直观性和可维护性。

## 6. public/ 目录

**功能/用法**：Next.js 项目的静态公共资源目录，存放最终会被直接暴漏出去的图片、SVG图标等。

**分析**：
*   **杂乱的根目录**：`public/` 根目录里散落了大量图片（`banner.png`, `globe.svg`, `logo-small.png` 等）。
*   **存在重叠的结构**：`public/` 内部有一个空的或者没有充分利用的 `images/` 子文件夹。这与之前提到项目根目录还有一个平级的 `images/` 文件夹问题相互叠加，非常混乱。
*   **建议**：建立并强制遵守 `public/images/`, `public/icons/`, `public/fonts/` 的规范。把所有 `.png` 移动到 `public/images/`，把所有 `.svg` 移动到 `public/icons/`。

## 7. scripts/ 目录

**功能/用法**：存放大量独立的 TypeScript 和 Python 运维/检查/迁移/测试脚本。

**分析**：
*   **代码文件过多且极度混杂**：目录直接暴露了约 35 个脚本文件。功能涵盖了各个阶段、各种类型：
    *   **业务数据维护/修复**：`billing-cleanup-pending-freezes.ts`, `billing-reconcile-ledger.ts`
    *   **架构检查/Linting**：`check-api-handler.ts`, `check-no-console.ts`, `check-log-semantic.ts`
    *   **数据迁移 (Migration)**：`migrate-cancelled-to-failed.ts`, `migrate-local-to-minio.ts`, `media-archive-legacy-refs.ts`
    *   **测试类**：`test-full-image-flow.ts`, `test-minio.ts`
    *   **一次性/临时脚本**：`tmp-cleanup-project-models.mjs`, `tmp-find-old-model.mjs`
*   **维护性与直观性极差**：这个目录就是一个巨大的“杂物抽屉”。长久不用的 `tmp-*` 脚本混在核心的 `check-*` 脚本中，测试脚本和生产环境运维脚本放在一起。
*   **建议大重构**：
    必须按照用途对 `scripts/` 进行归类重组，例如：
    *   `scripts/checks/` (放入所有 `check-*.ts`)
    *   `scripts/migrations/` (放入所有迁移数据、回填数据的脚本，如 `media-backfill-refs.ts`, `migrate-to-minio.ts`)
    *   `scripts/billing/` (处理计费对账逻辑脚本)
    *   `scripts/tests/` (独立执行的流程测试)
    *   **删除**所有带有 `tmp-` 前缀或属于一次性“干杂活”性质的过时文件。


## 8. src/ 目录概述

**功能/用法**：前端页面、组件、样式、业务逻辑、API 的核心源码存放处。
**分析**：项目显然使用了 Next.js 框架。既存在 `src/app/` (Next.js 13+ App Router)，又存在 `src/pages/` (旧版 Pages Router)。这两者混用是 Next.js 项目**过渡期（迁移期）代码**的典型特征。长期的混用会导致路由管理混乱、全局状态难以统一（App Router 和 Pages Router 获取上下文和生命周期的方式完全不同）。如果这是新项目或维护中项目，应当尽早推动向 App Router 的全面迁移。`src/` 目录下散落的 `instrumentation.ts`, `middleware.ts`, `i18n.ts` 均符合 Next.js 规范。

## 9. src/app/ 和 src/pages/ 目录

**功能/用法**：
*   `src/app/`：Next.js App Router 目录，包含了基于 Server Components 的页面路由和 API (`api/` 目录)。
*   `src/pages/`：旧版的 Next.js Pages Router 路由。

**分析**：
*   **不一致与迁移过渡**：如上文所述，`src/pages/` 目录下仅残留了 `_document.tsx` 等极其少量的文件。这说明项目很可能已经基本迁移到了 App Router，但还没有清理干净。
*   **建议**：彻底废弃并删除 `src/pages/`。如果是为了某些特殊原因保留 `_document.tsx`，请确认在 App Router 中是否可以被 `app/layout.tsx` 完全替代（通常是可以的），完成 100% App Router 架构。

## 10. src/components/ 目录

**功能/用法**：存放系统所有的 React UI 组件。

**分析**：
*   该目录下有非常多的子文件夹（如 `ai-elements/`, `assistant/`, `image-generation/`, `llm-console/` 等等），说明尝试过按业务模块拆分。
*   但同时，根目录下又混杂了直接裸露的业务级组件如 `LanguageSwitcher.tsx`, `UpdateNoticeModal.tsx`, `ProgressToast.tsx`。
*   **冗余与可维护性问题**：`components/` 本应存放**通用/展示型 (Presentational)** 组件，但这里混入了大量的**业务型 (Container/Feature)** 组件（如 `image-generation/`，`llm-console/`）。这就导致了跟 `src/features/` 目录职责的直接冲突。
*   **建议**：
    1.  将根目录裸露的 UI 组件收拢到 `components/shared/` 或 `components/ui/` 下。
    2.  严格区分“纯 UI 组件”和“业务组件”。与具体业务逻辑（如调用特定 API、绑定特定业务 Context）强相关的组件，应该移入 `src/features/` 中。`components/` 只保留诸如 Button、Dialog、Toast 这类不带业务上下文的基础组件。

## 11. src/features/ 目录

**功能/用法**：存放按业务功能划分的模块。目前看到只有 `video-editor`。

**分析**：
*   如果项目中大量业务组件都堆积在 `src/components/` 或者 `src/lib/`，那么 `src/features/` 形同虚设，体现了开发团队在执行“按 Feature 划分架构 (Feature-Sliced Design)” 时没有贯彻到底。
*   **建议**：梳理 `src/components/` 和 `src/lib/`，提取出真正的业务领域（例如：`image-generation`, `billing`, `storyboard`），将它们的组件、独有的 Hook、API 调用方法都聚拢到对应的 `src/features/<domain>/` 下，真正实现高内聚。


## 12. src/lib/ 目录 (核心重灾区)

**功能/用法**：存放通用工具函数、第三方库封装、API 调用等非 UI 层的核心业务逻辑。

**分析**：
*   **文件爆炸与过度拥挤**：这是整个项目最臃肿的目录。根目录下直接平铺了大约 40 个 TypeScript 文件，并且包含 32 个子文件夹。这说明开发过程中，任何不知道放在哪里的非组件代码，都被“丢”进了 `src/lib/`。
*   **功能极其混杂**：
    *   **基础工具**：`crypto-utils.ts`, `error-utils.ts`, `word-count.ts`, `json-repair.ts`
    *   **业务逻辑/状态管理**：`storyboard-phases.ts`, `episode-marker-detector.ts`
    *   **基础设施/中间件**：`api-auth.ts`, `api-fetch.ts`, `rate-limit.ts`, `redis.ts`, `prisma.ts`
    *   **特定第三方 SDK 封装**：`ark-llm.ts`, `ark-api.ts`, `openai-compat-*.ts`, `gemini-batch-utils.ts`
*   **可维护性极差**：正如用户所怀疑的，**“很多代码文件似乎都放在同一个文件夹没有按照功能/用法分门别类的排布”** 在这里体现得淋漓尽致。当一个新人想要找一个和“图片生成”有关的工具时，他必须在多达 70 多个条目（文件+文件夹）中进行肉眼搜索。
*   **重写与重构建议（高优）**：
    *   **基础设施层 (Infrastructure)**：将 `prisma.ts`, `redis.ts`, `api-fetch.ts`, `rate-limit.ts`, `config-service.ts` 抽离到 `src/infrastructure/` 或 `src/lib/core/` 中。
    *   **第三方服务层 (Services/Adapters)**：将大模型厂商强相关的逻辑 `ark-llm.ts`, `gemini-batch-utils.ts`, `openai-*` 以及 `voice/`, `lipsync/` 相关的目录，重组为 `src/services/` 或 `src/providers/`。
    *   **领域模型层 (Domains)**：将 `storyboard-phases.ts` 这种强业务逻辑移至 `src/features/storyboard/` 中。纯粹因为“没有 UI 就不算 feature” 的偏见导致了 `lib` 的过度膨胀。
    *   **纯工具函数 (Utils)**：将 `word-count.ts`, `crypto-utils.ts`, `error-utils.ts` 聚合成 `src/utils/`。不要让它们和底层数据库配置混在一起。

## 13. src/ 其他次要目录

**功能/用法与分析**：
*   `src/hooks/`：存放自定义 React Hooks。目前根目录下较空，有 `common/` 目录。这是正常的代码组织方式。建议仅保留与业务弱相关的通用 Hook (如 `useDebounce`, `useWindowSize`)，业务 Hook 移入对应的 `features/`。
*   `src/types/`：存放全局 TypeScript 泛型定义和接口（如 `project.ts`, `character-profile.ts`）。通常可以接受集中管理，但如果业务规模继续扩大，建议跟具体业务结合，放在各自模块下。
*   `src/contexts/`：React Context。存放了 `ToastContext.tsx` 等。由于 Context 也是一种状态共享，如果有大量的业务 Context，依然建议划分领域。
*   `src/styles/`：存放全局样式文件 `animations.css`, `ui-tokens-glass.css` 等，组织良好，比较清晰。

## 14. standards/ 目录

**功能/用法**：存放能力目录 (`capabilities/`)、定价 (`pricing/`)、大模型测试提示 (`prompt-canary/`)。
**分析**：这应该是一组**非代码类的数据标准、规格说明或白皮书**，用于界定系统能力或者计费标准。这种与具体功能解耦，把规则抽离出来作为标准文件管理的思路是非常好的，应当继续保持。不过如果是用于程序加载的 JSON/YAML 配置，则需要确保其被稳妥地导入。

## 15. tests/ 目录

**功能/用法**：测试用例目录，按照测试类型极其详尽地划分了 `unit/` (单元测试), `integration/` (集成测试), `system/` (系统级测试), `concurrency/` (并发测试), `contracts/` (契约测试), `regression/` (回归测试) 以及 `fixtures/` (固件/假数据) 等。
**分析**：
*   **结构异常优秀**：测试目录的组织是非常专业且标准的，各种维度的测试区分得非常清晰。
*   **需要注意的**：只要保证 `tests/` 中的目录结构能映射到 `src/` 中的结构（或者相反，保证单元测试与源码靠近，比如采用 `filename.test.ts` 靠近源码的方式，而集成测试放在 `tests/`），就可以维持很高的可维护性。

## 16. 总结与最终重构计划

综合来看，waoowaoo 代码库的核心矛盾在于**“随性的代码堆积”与“初期缺乏严格的模块化领域边界约束”**。特别是 `src/lib/` 和 `scripts/` 这两个地方已经出现了明显的**破窗效应**，即“不知道放哪里的代码就往这里塞”。

**您接手后，建议按以下优先级进行重构：**

1.  **首要目标（高优）—— 拯救 `src/lib` 和 `scripts/`**：
    *   将 `src/lib` 拆分为 `src/utils` (纯函数), `src/services` (外部API封装), `src/infrastructure` (数据库与中间件配置)。
    *   将业务代码从 `lib` 和 `components` 剥离，严格塞入 `src/features/<特定业务>` 中。
    *   对 `scripts/` 进行垃圾清理（删除 tmp 和过时代码），并按维护功能建立子文件夹。
2.  **次要目标（中优）—— 清理重叠与过渡期冗余**：
    *   彻底铲除 `src/pages` 的残留，完成 App Router 100% 的迁移。
    *   合并并删除项目根目录的 `lib/`，将内部的 Prompt 模版合并到 `src/` 下。
    *   处理双重 `images/` 问题，确立 `public/images/` 的绝对权威。
3.  **长效目标（低优）—— 国际化与数据字典梳理**：
    *   聚合 `messages/` 下过于细碎的 JSON 文件，降低翻译维护成本。
    *   评估 `prisma/schema.prisma` 的拆分可能性。

通过以上调整，代码库的架构将完全符合“简洁、精炼、直观”的标准，为接下来的长期迭代打下坚实的基础。

