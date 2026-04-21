# 有声书 Demo 独立拆分方案

> 目标：从 waoowaoo 中剥离有声书相关逻辑，在根目录下建立独立的 `audiobook-demo/` 项目，  
> 作为毕设第三部分"多角色有声书自动生成 Demo 系统"的完整交付物。

---

## 一、拆分原则

| 原则 | 说明 |
|------|------|
| **独立可运行** | `audiobook-demo/` 有独立的 `package.json`、`tsconfig.json`，`npm install && npm run dev` 即可启动 |
| **极简依赖** | 去掉 waoowaoo 的多模型选择、计费、权限、BullMQ 队列等企业级逻辑，直接用环境变量配置单一 API Key |
| **复制而非引用** | 所需文件直接复制到 demo 内部，不依赖 waoowaoo 的 `@/` 路径别名 |
| **SQLite 替代 MySQL** | Demo 用 SQLite + Prisma，零配置无需安装数据库 |
| **去掉 Redis/BullMQ** | 任务改为进程内直接执行，不需要队列 |
| **单一 LLM Provider** | 直接调用 OpenAI 兼容 API（可配为百炼/火山方舟/Deepseek），去掉模型网关/路由层 |
| **前端用 Gradio 或精简 Next.js** | 如果时间紧用 Python Gradio；如果复用 UI 组件则用精简 Next.js |

---

## 二、目标目录结构

```
waoowaoo/                        ← 原项目不动
audiobook-demo/                  ← 🆕 独立项目（根目录同级）
├── package.json
├── tsconfig.json
├── .env.example
├── prisma/
│   └── schema.prisma            ← SQLite，精简模型
├── prompts/
│   ├── character_profile.txt    ← 从 waoowaoo 提取精简
│   ├── character_voice.txt      ← 🆕 角色→音色描述
│   ├── screenplay_conversion.txt
│   ├── voice_analysis.txt       ← 扩展版（含旁白+情绪类型）
│   └── episode_split.txt
├── src/
│   ├── lib/
│   │   ├── llm.ts               ← 🆕 极简 LLM 调用（单 Provider）
│   │   ├── json-repair.ts       ← 从 waoowaoo 复制
│   │   ├── prisma.ts            ← Prisma Client 初始化
│   │   ├── providers/
│   │   │   ├── cosyvoice.ts     ← CosyVoice v3.5-plus（设计+合成）
│   │   │   └── index-tts2.ts    ← IndexTTS2 Fal（备选）
│   │   ├── pipeline/
│   │   │   ├── split-text.ts    ← 文本分段（复用 clip-matching 核心）
│   │   │   ├── extract-characters.ts  ← 角色提取
│   │   │   ├── design-voice.ts  ← 角色→音色设计
│   │   │   ├── convert-script.ts     ← 小说→剧本
│   │   │   ├── analyze-voice.ts      ← 台词+情绪分析
│   │   │   ├── synthesize.ts    ← 逐句 TTS 合成
│   │   │   └── stitch-audio.ts  ← 音频拼接导出
│   │   └── clip-matching.ts     ← 从 waoowaoo 复制（纯算法，零依赖）
│   ├── app/                     ← Next.js 页面（精简版）
│   │   ├── page.tsx             ← 首页：上传/粘贴文本
│   │   ├── project/[id]/
│   │   │   ├── page.tsx         ← 项目主页：阶段导航
│   │   │   ├── characters/      ← 角色管理+音色设计
│   │   │   ├── script/          ← 剧本预览
│   │   │   ├── voice/           ← 台词列表+情绪编辑+合成
│   │   │   └── export/          ← 导出播放
│   │   ├── api/
│   │   │   ├── projects/        ← 项目 CRUD
│   │   │   ├── pipeline/        ← 流水线 API
│   │   │   └── voice/           ← 合成 API
│   │   └── layout.tsx
│   └── components/
│       ├── VoiceLineCard.tsx     ← 从 waoowaoo 复制精简
│       ├── EmotionPanel.tsx      ← 从 waoowaoo 复制精简+扩展
│       ├── AudioPlayer.tsx       ← 🆕 连续播放器
│       └── CharacterCard.tsx     ← 🆕 角色+音色卡片
├── next.config.ts
└── README.md
```

---

## 三、waoowaoo → audiobook-demo 文件映射

### 3.1 直接复制（纯逻辑，零外部依赖）

| waoowaoo 源文件 | → demo 目标 | 改动 |
|---|---|---|
| `src/lib/novel-promotion/story-to-script/clip-matching.ts` | `src/lib/clip-matching.ts` | 原样复制，零改动（纯算法） |
| `src/lib/json-repair.ts` | `src/lib/json-repair.ts` | 原样复制（仅依赖 `jsonrepair` npm 包） |
| `src/types/character-profile.ts` | `src/lib/types.ts` | 原样复制 |

### 3.2 提取 + 精简（去掉企业级封装）

| waoowaoo 源文件 | → demo 目标 | 精简内容 |
|---|---|---|
| `src/lib/ai-runtime/` (4 文件) | `src/lib/llm.ts` (1 文件) | 去掉 model-gateway/userId/billing，直接调 OpenAI SDK |
| `src/lib/providers/bailian/voice-design.ts` | `src/lib/providers/cosyvoice.ts` | 去掉 apiKey 多路由，改为读环境变量；增加 CosyVoice 支持 |
| `src/lib/providers/bailian/tts.ts` | 合并到 `cosyvoice.ts` | 去掉分段合并逻辑（demo 短文本），增加 instruction/rate/pitch |
| `src/lib/voice/generate-voice-line.ts` | `src/lib/pipeline/synthesize.ts` | 去掉 prisma 查询/storage 上传，简化为纯函数 |
| `src/lib/voice/provider-voice-binding.ts` | 删除 | Demo 直接用 voiceId，不需要多 Provider 绑定逻辑 |
| `src/lib/workers/handlers/voice-analyze.ts` | `src/lib/pipeline/analyze-voice.ts` | 去掉 BullMQ Job/prisma 事务，改为直接函数调用 |
| `src/lib/workers/handlers/screenplay-convert.ts` | `src/lib/pipeline/convert-script.ts` | 同上 |
| `src/lib/workers/handlers/character-profile.ts` | `src/lib/pipeline/extract-characters.ts` | 同上，去掉视觉生成部分 |
| `src/lib/workers/handlers/analyze-global-parse.ts` | 合并到 `extract-characters.ts` | 只保留角色解析辅助函数 |
| `src/lib/workers/handlers/voice-analyze-helpers.ts` | 合并到 `analyze-voice.ts` | — |
| `src/lib/novel-promotion/story-to-script/orchestrator.ts` | `src/lib/pipeline/split-text.ts` | 只保留 Clip 切分逻辑，去掉场景/道具分析 |

### 3.3 Prompt 文件提取

| waoowaoo Prompt | → demo Prompt | 改动 |
|---|---|---|
| `lib/prompts/novel-promotion/agent_character_profile.zh.txt` | `prompts/character_profile.txt` | 去掉视觉相关规则（服装/色彩/子形象），只保留身份/性格/关系提取 |
| `lib/prompts/novel-promotion/agent_clip.zh.txt` | `prompts/episode_split.txt` | 去掉道具/场景库匹配规则，简化为纯文本切分 |
| `lib/prompts/novel-promotion/screenplay_conversion.zh.txt` | `prompts/screenplay_conversion.txt` | 去掉场景/角色资产库匹配，简化为纯格式转换 |
| `lib/prompts/novel-promotion/voice_analysis.zh.txt` | `prompts/voice_analysis.txt` | **扩展**：增加旁白提取 + emotionType + emotionInstruction 输出 |
| 🆕 | `prompts/character_voice.txt` | 全新编写：profileData → voice_prompt |

### 3.4 前端组件提取

| waoowaoo 组件 | → demo 组件 | 改动 |
|---|---|---|
| `voice/VoiceLineCard.tsx` | `components/VoiceLineCard.tsx` | 去掉镜头匹配/任务状态，保留播放/情绪/生成 |
| `voice/EmotionSettingsPanel.tsx` | `components/EmotionPanel.tsx` | 扩展 emotionType + speakingRate/pitchRate slider |
| `voice/VoiceDesignGeneratorSection.tsx` | 合并到 `CharacterCard.tsx` | 精简 |
| 🆕 | `components/AudioPlayer.tsx` | 全新：连续播放全部台词 |
| 🆕 | `components/CharacterCard.tsx` | 全新：角色+音色预览卡片 |

### 3.5 完全不需要的文件（不复制）

| 类别 | 文件 | 原因 |
|------|------|------|
| 多模型网关 | `src/lib/model-gateway/`, `src/lib/llm-client.ts`, `src/lib/ark-llm.ts` | Demo 直接调单一 API |
| 任务队列 | `src/lib/workers/`, BullMQ, Redis | Demo 进程内直接执行 |
| 计费/余额 | `src/lib/billing/`, UserBalance | 不需要 |
| 认证/权限 | `src/lib/auth/`, next-auth | Demo 无登录 |
| 存储服务 | `src/lib/storage/` (COS) | 本地文件系统 |
| 视觉生成 | `CharacterAppearance`, 分镜, 画面生成 | 有声书不需要 |
| 视频编辑 | `VideoEditorProject`, Remotion | 不需要 |
| 国际化 | `next-intl`, messages/ | Demo 纯中文 |
| 媒体处理 | `src/lib/media/`, sharp | 不需要图片处理 |
| 日志观测 | `src/lib/logging/`, `src/lib/llm-observe/` | 简化为 console.log |
| 全局资产 | `GlobalVoice`, `GlobalCharacter`, `asset-hub/` | Demo 项目内管理 |

---

## 四、核心架构简化对比

### 4.1 LLM 调用：从模型网关到直接调用

**waoowaoo 原有链路**（5 层）：
```
executeAiTextStep → model-gateway → llm-client → provider-adapter → OpenAI API
                    ↓
              userId/billing/routing/logging
```

**Demo 精简为**（1 层）：
```typescript
// src/lib/llm.ts — 整个文件 ~40 行
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY!,
  baseURL: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
})

export async function callLLM(prompt: string, maxTokens = 4096): Promise<string> {
  const completion = await client.chat.completions.create({
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature: 0.7,
  })
  return completion.choices[0]?.message?.content || ''
}
```

配置为百炼/火山方舟只需修改 `.env`：
```env
LLM_API_KEY=sk-xxx
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-plus
```

### 4.2 TTS 调用：去掉 Provider 路由

**waoowaoo 原有链路**：
```
generate-voice-line
  → resolveModelSelection (多模型选择)
  → getProviderKey (Provider 路由)
  → resolveVoiceBinding (Character/Episode 两级绑定)
  → if fal: generateVoiceWithIndexTTS2
    elif bailian: synthesizeWithBailianTTS
```

**Demo 精简为**：
```typescript
// src/lib/providers/cosyvoice.ts — 单一 Provider
export async function designVoice(voicePrompt: string, previewText: string) {
  // 直接调 CosyVoice voice-enrollment API
}

export async function synthesize(params: {
  text: string
  voiceId: string
  instruction?: string
  rate?: number
  pitch?: number
  volume?: number
}) {
  // 直接调 CosyVoice v3.5-plus WebSocket API
}
```

### 4.3 数据库：MySQL + Prisma → SQLite + Prisma

**waoowaoo 原有 Schema**（20+ 个 model，复杂关联）。

**Demo 精简为 4 个 model**：

```prisma
// audiobook-demo/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Project {
  id          String      @id @default(uuid())
  name        String
  novelText   String                          // 原始小说全文
  createdAt   DateTime    @default(now())
  characters  Character[]
  episodes    Episode[]
}

model Character {
  id              String   @id @default(uuid())
  projectId       String
  name            String
  aliases         String?                     // JSON: ["别名1"]
  gender          String?                     // "男" | "女"
  ageRange        String?                     // "约二十五岁"
  archetype       String?                     // "霸道总裁"
  personalityTags String?                     // JSON: ["高冷","腹黑"]
  introduction    String?                     // 角色介绍
  profileData     String?                     // JSON: 完整角色档案

  // ── 声音人设 ──
  voicePrompt     String?                     // AI 生成的音色描述
  voiceId         String?                     // CosyVoice voice_id
  voiceTargetModel String?                    // "cosyvoice-v3.5-plus"
  voicePreviewUrl String?                     // 预览音频本地路径

  project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model Episode {
  id            String      @id @default(uuid())
  projectId     String
  episodeNumber Int
  name          String
  content       String                        // 本集文本内容
  screenplay    String?                       // JSON: 剧本结构
  createdAt     DateTime    @default(now())

  project       Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  voiceLines    VoiceLine[]
}

model VoiceLine {
  id                  String   @id @default(uuid())
  episodeId           String
  lineIndex           Int
  speaker             String
  content             String                  // 台词文本
  lineType            String   @default("dialogue") // dialogue|narration|inner_thought

  // ── 情绪 ──
  emotionType         String?                 // angry|happy|sad|calm|...
  emotionStrength     Float?   @default(0.4)
  emotionInstruction  String?                 // CosyVoice instruction
  emotionalStrengths  String?                 // JSON: 八维向量

  // ── 韵律 ──
  speakingRate        Float?                  // 0.5-2.0
  pitchRate           Float?                  // 0.5-2.0
  volumeLevel         Int?                    // 0-100

  // ── 音频 ──
  audioPath           String?                 // 本地音频文件路径
  audioDuration       Int?                    // 毫秒

  episode             Episode  @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@unique([episodeId, lineIndex])
}
```

**对比**：

| | waoowaoo | Demo |
|---|---|---|
| DB | MySQL (需安装) | SQLite (零配置) |
| Model 数量 | 20+ | 4 |
| 关联复杂度 | 多层级 + MediaObject | 扁平 3 层 |
| 音频存储 | COS 对象存储 | 本地 `./output/` 目录 |
| 用户系统 | User/Account/Session | 无 |

### 4.4 任务执行：BullMQ 队列 → 直接执行

**waoowaoo**：API Route → 创建 BullMQ Job → Worker 异步处理 → 轮询/SSE 状态

**Demo**：API Route → 直接 `await pipeline.run()` → 返回结果

```typescript
// Demo: src/app/api/pipeline/analyze/route.ts
export async function POST(req: Request) {
  const { projectId, episodeId } = await req.json()
  // 直接执行，无队列
  const result = await analyzeVoiceLines(projectId, episodeId)
  return Response.json(result)
}
```

---

## 五、精简后的依赖清单

### `audiobook-demo/package.json`

```json
{
  "name": "audiobook-demo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^6.19.2",
    "jsonrepair": "^3.13.2",
    "next": "^15.5.7",
    "openai": "^6.8.1",
    "prisma": "^6.19.2",
    "react": "^19.1.2",
    "react-dom": "^19.1.2"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

**对比**：

| | waoowaoo | Demo |
|---|---|---|
| dependencies | 35 个 | **7 个** |
| 去掉的 | bullmq, ioredis, @fal-ai/client, @ai-sdk/*, @aws-sdk/*, cos-nodejs-sdk-v5, next-auth, next-intl, mammoth, sharp, remotion, archiver, zod, express, bcryptjs, lru-cache... | — |
| 保留核心 | — | next, react, openai, prisma, jsonrepair |

### `.env.example`

```env
# LLM（OpenAI 兼容，可配为百炼/火山方舟）
LLM_API_KEY=sk-xxx
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-plus

# CosyVoice（百炼 TTS）
DASHSCOPE_API_KEY=sk-xxx
COSYVOICE_MODEL=cosyvoice-v3.5-plus

# 可选：IndexTTS2 (Fal)
# FAL_API_KEY=xxx
# FAL_ENDPOINT=fal-ai/index-tts-2
```

---

## 六、核心 Pipeline 流程

```
用户输入小说文本
    │
    ▼
┌─ split-text.ts ─┐
│  episode_split    │  LLM 分段 + clip-matching 边界校准
│  Prompt           │
└────────┬─────────┘
         ▼
┌─ extract-characters.ts ─┐
│  character_profile       │  LLM 提取角色档案
│  Prompt                  │  (gender/age/personality/archetype)
└────────┬────────────────┘
         ▼
┌─ design-voice.ts ─┐
│  character_voice   │  LLM: profileData → voice_prompt
│  Prompt            │  CosyVoice API: voice_prompt → voice_id
└────────┬──────────┘
         ▼
┌─ convert-script.ts ─┐
│  screenplay          │  LLM 小说→剧本（对话/旁白/动作）
│  Prompt              │
└────────┬────────────┘
         ▼
┌─ analyze-voice.ts ─┐
│  voice_analysis     │  LLM 提取台词 + 发言人 + 情绪类型
│  Prompt             │  + emotionInstruction + 韵律建议
└────────┬───────────┘
         ▼
┌─ synthesize.ts ─┐
│  CosyVoice TTS  │  逐句合成:
│                  │  voice=voice_id + instruction + rate/pitch
└────────┬────────┘
         ▼
┌─ stitch-audio.ts ─┐
│  音频拼接           │  按台词顺序拼接 → 完整有声书
└────────┬──────────┘
         ▼
    导出 .wav/.mp3
```

每一步对应一个文件，函数签名统一：

```typescript
// 示例: src/lib/pipeline/extract-characters.ts
import { callLLM } from '../llm'
import { safeParseJsonObject } from '../json-repair'
import { prisma } from '../prisma'
import fs from 'fs/promises'

const PROMPT = await fs.readFile('prompts/character_profile.txt', 'utf-8')

export async function extractCharacters(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  const prompt = PROMPT.replace('{input}', project!.novelText)
  const response = await callLLM(prompt, 4096)
  const parsed = safeParseJsonObject(response)
  // ... 存入 Character 表
}
```

---

## 七、前端页面规划（精简 4 页）

```
/                         ← 首页：创建项目 / 上传文本
/project/[id]             ← 项目主页：4步流水线
/project/[id]/characters  ← 角色管理 + 音色设计
/project/[id]/voice       ← 台词列表 + 情绪编辑 + 合成
```

### 项目主页：4步导航

```
┌───────────────────────────────────────────────────┐
│  ① 文本解析  →  ② 角色音色  →  ③ 台词合成  →  ④ 导出  │
│   [已完成✓]      [进行中]       [待开始]      [待开始]  │
└───────────────────────────────────────────────────┘
```

- **Step 1 文本解析**：点击后依次执行 split → extract-characters → convert-script
- **Step 2 角色音色**：显示角色列表，每个角色可"自动设计音色"或"手动上传"
- **Step 3 台词合成**：analyze-voice → 台词列表 → 逐条/批量合成
- **Step 4 导出**：stitch → 播放器 → 下载

### 复用的 UI 组件

从 waoowaoo 复制 + 精简：

**`VoiceLineCard.tsx`** — 去掉：

```diff
- matchedPanelId / matchedStoryboardId     ← 有声书无分镜
- lineTaskRunning / TaskStatusInline        ← 无异步任务
- onLocatePanel                             ← 无分镜跳转
+ lineType badge (对话/旁白/独白)           ← 新增
```

**`EmotionPanel.tsx`** — 扩展：

```diff
  emotionPrompt input                       ← 保留（改为自动生成+可编辑）
  emotionStrength slider                    ← 保留
+ emotionType select dropdown               ← 🆕
+ speakingRate slider (0.5x - 2.0x)         ← 🆕
+ pitchRate slider (0.5x - 2.0x)            ← 🆕
+ volumeLevel slider (0 - 100)              ← 🆕
```

---

## 八、开发计划

| Phase | 天数 | 内容 |
|-------|------|------|
| **P0: 项目骨架** | 1天 | `package.json`, `tsconfig.json`, Prisma Schema, `llm.ts`, `.env`, 目录结构 |
| **P1: Pipeline 核心** | 3天 | 复制 `clip-matching` + `json-repair`；实现 6 个 pipeline 函数；Prompt 提取精简 |
| **P2: CosyVoice 集成** | 2天 | `cosyvoice.ts`（声音设计 + 语音合成）；本地音频存储 |
| **P3: 前端 4 页** | 3天 | 首页/项目页/角色页/台词页；复制精简 VoiceLineCard + EmotionPanel |
| **P4: 拼接导出** | 1天 | `stitch-audio.ts` + AudioPlayer + 下载 |
| **P5: 测试打磨** | 2天 | 端到端测试，README 编写，录制 Demo |
| **合计** | **~12天** | |

---

## 九、关键简化决策速查

| 问题 | waoowaoo | Demo |
|------|----------|------|
| 数据库 | MySQL + Docker | SQLite 文件 |
| 用户系统 | next-auth + 多用户 | 无登录 |
| LLM 调用 | 模型网关 + 多 Provider + 计费 | 直接 `openai` SDK |
| TTS 调用 | 3 个 Provider + 绑定路由 | 单一 CosyVoice |
| 任务执行 | BullMQ + Redis + Worker 进程 | 进程内直接 await |
| 音频存储 | COS 对象存储 + 签名 URL | 本地 `./output/` |
| 文件上传 | MediaObject + 签名上传 | multer / FormData |
| 国际化 | next-intl 中英双语 | 纯中文 |
| 日志 | 结构化日志 + 文件写入 | console.log |
| 前端框架 | Next.js + 多模态 + 大量组件 | Next.js 最小化 4 页 |
