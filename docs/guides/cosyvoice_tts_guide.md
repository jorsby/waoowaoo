# CosyVoice 语音合成综合指南

> 信息来源：阿里云百炼平台官方文档，整理日期：2026-04-04

---

## 1. 概述

CosyVoice 是阿里云百炼平台提供的语音合成（Text-to-Speech, TTS）服务，基于生成式语音大模型，将文本转换为自然语音。

### 核心功能

- **实时生成高保真语音**：支持中英等多语种自然发声
- **音色定制**：提供声音复刻（基于音频样本）与声音设计（基于文本描述）两种方式
- **流式输入输出**：低延迟响应，适合实时交互场景
- **精细控制**：可调节语速、语调、音量与码率
- **多格式支持**：兼容 pcm、wav、mp3、opus，最高支持 48kHz 采样率

---

## 2. 模型列表

### 中国内地（北京地域）

| 模型名称 | 说明 |
|---|---|
| `cosyvoice-v3.5-plus` | 最新旗舰，支持声音设计/复刻，**无系统音色**，仅北京地域 |
| `cosyvoice-v3.5-flash` | 轻量快速版，支持声音设计/复刻，**无系统音色**，仅北京地域 |
| `cosyvoice-v3-plus` | 高质量版本，支持系统音色 |
| `cosyvoice-v3-flash` | 性价比版本，支持系统音色 |
| `cosyvoice-v2` | 上一代模型 |
| `cosyvoice-v1` | 初代模型，功能最少 |

### 国际（新加坡地域）

| 模型名称 | 说明 |
|---|---|
| `cosyvoice-v3-plus` | 高质量版本 |
| `cosyvoice-v3-flash` | 性价比版本 |

> 国际版不支持声音复刻和声音设计功能。

---

## 3. 模型选型建议

| 场景 | 推荐模型 | 理由 | 注意事项 |
|---|---|---|---|
| 品牌声音定制（文本描述） | cosyvoice-v3.5-plus | 支持声音设计，无需音频样本 | 仅北京地域，无系统音色 |
| 品牌声音定制（音频样本） | cosyvoice-v3.5-plus | 支持声音复刻，高度还原音色 | 仅北京地域，无系统音色 |
| 智能客服/语音助手 | cosyvoice-v3-flash / v3.5-flash | 成本低，支持流式交互、情感表达 | v3.5-flash 仅北京地域 |
| 移动端嵌入式 | CosyVoice 全系列 | SDK 全覆盖，流式支持强 | v1 不支持 SSML |
| 方言广播 | cosyvoice-v3.5-plus | 支持东北话、闽南语等多种方言 | 仅北京地域 |
| 教育（含公式朗读） | v2 / v3-flash / v3-plus | 支持 LaTeX 公式转语音 | v2 和 v3-plus 成本较高(2元/万字符) |
| 结构化播报（新闻/公告） | v3-plus / v3-flash / v2 | 支持 SSML 控制语速/停顿/发音 | 需额外开发 SSML 生成逻辑 |
| 字幕/时间戳对齐 | v3-flash / v3-plus / v2 | 支持字级别时间戳输出 | 需显式启用，默认关闭 |
| 多语言出海 | v3-flash / v3-plus | 支持多语种 | — |

---

## 4. 模型功能特性对比

### 中国内地

| 功能/特性 | v3.5-plus | v3.5-flash | v3-plus | v3-flash | v2 | v1 |
|---|---|---|---|---|---|---|
| **支持语言** | 因音色而异（含多种方言） | 因音色而异（含多种方言） | 因音色而异 | 因音色而异（含多种方言） | 因音色而异 | 中文、英文 |
| **音频格式** | pcm/wav/mp3/opus | pcm/wav/mp3/opus | pcm/wav/mp3/opus | pcm/wav/mp3/opus | pcm/wav/mp3/opus | pcm/wav/mp3/opus |
| **采样率** | 8k~48kHz | 8k~48kHz | 8k~48kHz | 8k~48kHz | 8k~48kHz | 8k~48kHz |
| **声音复刻** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **声音设计** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **SSML** | ✅（复刻音色+标记音色） | ✅ | ✅ | ✅ | ✅ | ❌ |
| **LaTeX** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **音量调节** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **语速调节** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **音高调节** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **流式输入** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **流式输出** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **时间戳** | ✅（复刻音色+标记音色） | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Instruct 指令** | ✅ | ✅ | ✅（标记音色） | ✅（复刻+标记音色） | ❌ | ❌ |
| **AIGC 标识** | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Markdown 过滤** | ❌ | ❌ | ❌ | ✅（复刻音色） | ❌ | ❌ |
| **热修复(hot_fix)** | ❌ | ❌ | ❌ | ✅（复刻音色） | ❌ | ❌ |
| **seed 随机种子** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **language_hints** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **系统音色** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## 5. API 参考

### 5.1 非实时 HTTP API

**URL**

```
POST https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer
```

> 该 API 仅在中国内地（北京地域）可用。

**Headers**

| 参数 | 类型 | 必选 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | `Bearer <your_api_key>` |
| Content-Type | string | 是 | `application/json` |
| X-DashScope-SSE | string | 否 | 流式输出时设为 `enable` |

**请求参数**

| 参数 | 类型 | 默认值 | 必选 | 说明 |
|---|---|---|---|---|
| `model` | string | — | 是 | 模型名称 |
| `input.text` | string | — | 是 | 待合成文本，支持 SSML 和 LaTeX |
| `input.voice` | string | — | 是 | 音色（系统/复刻/设计音色） |
| `input.format` | string | mp3 | 否 | 音频格式：mp3/pcm/wav/opus |
| `input.sample_rate` | integer | 22050 | 否 | 采样率：8000/16000/22050/24000/44100/48000 |
| `input.volume` | integer | 50 | 否 | 音量 [0, 100] |
| `input.rate` | float | 1.0 | 否 | 语速 [0.5, 2.0] |
| `input.pitch` | float | 1.0 | 否 | 音高 [0.5, 2.0] |
| `input.bit_rate` | integer | 32 | 否 | 码率 [6, 510] kbps，仅 opus |
| `input.enable_ssml` | boolean | false | 否 | 是否开启 SSML |
| `input.word_timestamp_enabled` | boolean | false | 否 | 是否开启字级时间戳 |
| `input.seed` | integer | 0 | 否 | 随机种子 [0, 65535]，v1 不支持 |
| `input.language_hints` | array[string] | — | 否 | 目标语言提示（zh/en/fr/de/ja/ko/ru/pt/th/id/vi） |
| `input.instruction` | string | — | 否 | 指令控制（情感/方言/角色），≤100字符 |
| `input.enable_aigc_tag` | boolean | false | 否 | 是否添加 AIGC 隐性标识 |
| `input.hot_fix` | object | — | 否 | 发音热修复（仅 v3-flash 复刻音色） |
| `input.enable_markdown_filter` | boolean | false | 否 | Markdown 过滤（仅 v3-flash 复刻音色） |

**非流式请求示例**

```bash
curl -X POST https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer \
-H "Authorization: Bearer $DASHSCOPE_API_KEY" \
-H "Content-Type: application/json" \
-d '{
    "model": "cosyvoice-v3-flash",
    "input": {
      "text": "我家的后面有一个很大的园。",
      "voice": "longanyang",
      "format": "wav",
      "sample_rate": 24000
    }
}'
```

**返回体**

```json
{
  "request_id": "ee88b03d-xxxx",
  "output": {
    "finish_reason": "stop",
    "audio": {
      "data": "",
      "url": "http://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/...",
      "id": "audio_ee88b03d-xxxx",
      "expires_at": 1772697707
    }
  },
  "usage": {
    "characters": 15
  }
}
```

**流式返回体**中包含事件类型：
- `sentence-begin`：句子开始，返回句子文本
- `sentence-synthesis`：音频数据块（Base64）
- `sentence-end`：句子结束，返回计费字符数

### 5.2 WebSocket API（全双工流式）

**URL**

| 地域 | URL |
|---|---|
| 北京 | `wss://dashscope.aliyuncs.com/api-ws/v1/inference` |
| 新加坡 | `wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference` |

> CosyVoice 系列模型**仅支持 WebSocket 连接调用**（SDK 内部封装了 WebSocket），不支持直接 HTTP REST 调用。非实时 HTTP API 是独立接口。

**交互流程**

```
客户端                          服务端
  |-- 建立 WebSocket 连接 -------->|
  |-- run-task 指令 -------------->|
  |<-- task-started 事件 ----------|
  |-- continue-task 指令 (文本1) ->|
  |<-- result-generated + 音频流 --|
  |-- continue-task 指令 (文本2) ->|
  |<-- result-generated + 音频流 --|
  |-- finish-task 指令 ----------->|
  |<-- task-finished 事件 ---------|
  |-- 关闭连接 ------------------->|
```

**关键要求**：
- 同一任务中 run-task / continue-task / finish-task 必须使用**相同的 task_id**
- 必须发送 finish-task，否则音频可能不完整
- 建议复用 WebSocket 连接处理多个任务

**run-task 指令示例**

```json
{
  "header": {
    "action": "run-task",
    "task_id": "uuid-xxxx",
    "streaming": "duplex"
  },
  "payload": {
    "task_group": "audio",
    "task": "tts",
    "function": "SpeechSynthesizer",
    "model": "cosyvoice-v3-flash",
    "parameters": {
      "text_type": "PlainText",
      "voice": "longanyang",
      "format": "mp3",
      "sample_rate": 22050,
      "volume": 50,
      "rate": 1,
      "pitch": 1
    },
    "input": {}
  }
}
```

**支持的编程语言**：Go (gorilla/websocket)、PHP (Ratchet)、Node.js (ws)、Java、Python、C#

### 5.3 SDK 调用

**Python SDK**

```python
import dashscope
from dashscope.audio.tts_v2 import SpeechSynthesizer

dashscope.api_key = os.environ.get('DASHSCOPE_API_KEY')
dashscope.base_websocket_api_url = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference'

synthesizer = SpeechSynthesizer(model="cosyvoice-v3-flash", voice="longanyang")
audio = synthesizer.call("今天天气怎么样？")
```

**Java SDK**

```java
SpeechSynthesisParam param = SpeechSynthesisParam.builder()
    .apiKey(System.getenv("DASHSCOPE_API_KEY"))
    .model("cosyvoice-v3-flash")
    .voice("longanyang")
    .build();
SpeechSynthesizer synthesizer = new SpeechSynthesizer(param, null);
ByteBuffer audio = synthesizer.call("今天天气怎么样？");
```

---

## 6. 声音复刻 API

基于 10~20 秒音频样本即可生成高度相似的定制声音，无需传统训练过程。

### 关键概念

- `model`：固定为 `voice-enrollment`
- `target_model`：驱动音色的语音合成模型，**必须与后续合成时的 model 一致**

### RESTful API

**URL**

| 地域 | URL |
|---|---|
| 中国内地 | `POST https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer` |
| 国际 | `POST https://dashscope-intl.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer` |

### 接口列表

| 操作 | action 值 | 说明 |
|---|---|---|
| 创建音色 | `create_voice` | 提交音频 URL 创建复刻音色 |
| 查询音色列表 | `list_voice` | 分页查询已创建的音色 |
| 查询特定音色 | `query_voice` | 通过 voice_id 查询详情 |
| 更新音色 | `update_voice` | 使用新音频更新音色（仅复刻） |
| 删除音色 | `delete_voice` | 删除指定音色 |

### 创建音色参数

| 参数 | 类型 | 必选 | 说明 |
|---|---|---|---|
| `model` | string | 是 | 固定为 `voice-enrollment` |
| `action` | string | 是 | 固定为 `create_voice` |
| `target_model` | string | 是 | 语音合成模型（v3.5-plus/v3.5-flash/v3-plus/v3-flash/v2/v1） |
| `url` | string | 是（复刻） | 公网可访问的音频文件 URL |
| `voice_prompt` | string | 是（设计） | 声音描述，≤500字符，仅中英文 |
| `preview_text` | string | 是（设计） | 试听文本 |
| `prefix` | string | 否 | 音色名称前缀，≤10字符 |
| `language_hints` | array | 否 | 源音频语种提示 |
| `max_prompt_audio_length` | float | 否 | 参考音频最大时长(秒) [3.0, 30.0]，仅 v3-flash |
| `enable_preprocess` | boolean | 否 | 音频预处理（降噪/增强），仅 v3.5/v3-flash |

### 复刻支持的语言

| 模型 | 支持语言 |
|---|---|
| v1 / v2 | 中文（普通话）、英文 |
| v3-flash | 中文（普通话+16种方言）、英法德日韩俄葡泰印尼越 |
| v3-plus | 中文（普通话）、英法德日韩俄 |
| v3.5-plus / v3.5-flash | 中文（普通话+10种方言）、英法德日韩俄葡泰印尼越 |

### 音色状态

| 状态 | 说明 |
|---|---|
| `DEPLOYING` | 审核中 |
| `OK` | 审核通过，可调用 |
| `UNDEPLOYED` | 审核不通过 |

### Python SDK 示例

```python
from dashscope.audio.tts_v2 import VoiceEnrollmentService

service = VoiceEnrollmentService()
voice_id = service.create_voice(
    target_model='cosyvoice-v3.5-plus',
    prefix='myvoice',
    url='https://your-audio-file-url'
)
print(f"Voice ID: {voice_id}")
```

### 计费

- 创建/查询/更新/删除音色：**免费**
- 使用复刻音色进行语音合成：**按量计费**（见价格表）

---

## 7. 声音设计 API

基于 FunAudioGen-VD 模型，通过文本描述生成定制化音色，**无需音频样本**。

- **仅 cosyvoice-v3.5-plus 和 cosyvoice-v3.5-flash 支持**
- Java/Python DashScope SDK **不支持**声音设计，需使用 RESTful API
- 相同 Prompt 设计的音色可能不同，建议多次尝试挑选最佳结果

### 声音描述编写建议

| 维度 | 示例 |
|---|---|
| 性别 | 男性、女性、中性 |
| 年龄 | 儿童、青年、中年、老年 |
| 音调 | 高音、中音、低音 |
| 语速 | 快速、中速、缓慢 |
| 情感 | 开朗、沉稳、温柔、严肃 |
| 特点 | 有磁性、清脆、沙哑、甜美 |

**推荐示例**：
- "年轻活泼的女性声音，语速较快，带有明显的上扬语调，适合介绍时尚产品。"
- "沉稳的中年男性，语速缓慢，音色低沉有磁性，适合朗读新闻或纪录片解说。"

---

## 8. SSML 标记语言

基于 W3C SSML 1.0 规范，支持对语速、语调、停顿、音量等进行精细控制。

### 支持的模型

cosyvoice-v3.5-plus、v3.5-flash、v3-plus、v3-flash、v2（v1 不支持）

### 主要标签

| 标签 | 功能 | 说明 |
|---|---|---|
| `<speak>` | 根节点 | 必须包裹所有 SSML 内容。可设置 voice/rate/pitch/volume/effect/bgm |
| `<break>` | 控制停顿 | `time="2s"` 或 `time="500ms"`，累计最大 10 秒 |
| `<say-as>` | 设置读法 | 支持类型见下表 |

### `<say-as>` 支持的 interpret-as 类型

| 类型 | 说明 | 示例 |
|---|---|---|
| `cardinal` | 整数/小数常见读法 | 145 → "一百四十五" |
| `digits` | 逐个数字读出 | 123 → "一二三" |
| `telephone` | 电话号码读法 | 支持手机号/座机/服务号 |
| `name` | 人名读法 | — |
| `address` | 地址读法 | — |
| `id` | 账户/昵称读法 | — |
| `characters` | 逐字符读出 | ISBN 1-001 → "I S B N 一 杠 零 零 一" |
| `punctuation` | 标点读法 | — |
| `date` | 日期读法 | 支持中英文多种格式 |
| `time` | 时间读法 | 支持时刻、范围、AM/PM |
| `currency` | 金额读法 | 支持 RMB/USD/EUR/GBP 等 |
| `measure` | 计量单位读法 | 支持长度/面积/体积/重量等 |

### `<speak>` 高级属性

- `bgm`：添加背景音乐（需 OSS 存储，公共读权限）
- `backgroundMusicVolume`：背景音乐音量
- `effect` / `effectValue`：音效设置

### SSML 示例

```xml
<speak voice="longanyang" rate="0.8" volume="80">
  今天是<say-as interpret-as="date">2026年4月4日</say-as>，
  天气晴朗。<break time="1s"/>
  温度为<say-as interpret-as="measure">25℃</say-as>。
</speak>
```

---

## 9. 音色列表概览

### cosyvoice-v3-flash / v3-plus 代表音色

| 场景 | 音色名 | voice 参数 | 特质 | 语言 | Instruct |
|---|---|---|---|---|---|
| 社交陪伴（标杆） | 龙安洋 | `longanyang` | 阳光大男孩 20~30岁 | 中文/英文 | ✅ |
| 社交陪伴 | 龙安欢 | `longanhuan` | — | 中文/英文 | ✅ |
| 儿童 | 龙虎虎 | `longhuhu_v3` | 天真烂漫女童 6~10岁 | 中文/英文 | ✅ |
| 方言 | 龙嘉欣 | `longjiaxin_v3` | 优雅粤语女 30~35岁 | 粤语/英文 | ❌ |
| 客服 | 龙应询 | `longyingxun_v3` | 年轻青涩男 | 中文/英文 | ❌ |
| 语音助手 | 龙小淳 | `longxiaochun_v3` | 知性积极女 25~30岁 | 中文/英文 | ❌ |
| 有声书 | 龙妙 | `longmiao_v3` | 抑扬顿挫女 25~30岁 | 中文/英文 | ❌ |
| 有声书 | 龙三叔 | `longsanshu_v3` | 沉稳质感男 25~45岁 | 中文/英文 | ❌ |
| 直播带货 | 龙安燃 | `longanran_v3` | 活泼质感女 | 中文/英文 | ❌ |
| 新闻播报 | 龙硕 | `longshuo_v3` | 博才干练男 25~30岁 | 中文/英文 | ❌ |

### cosyvoice-v2 代表音色

| 场景 | 音色名 | voice 参数 | 特质 |
|---|---|---|---|
| 短视频配音 | 龙机器 | `longjiqi` | 呆萌机器人 |
| 短视频配音 | 龙猴哥 | `longhouge` | 经典猴哥 |
| 方言 | 龙老铁 | `longlaotie_v2` | 东北直率男 |
| 出海营销 | loongyuuna | `loongyuuna_v2` | 元气霓虹女（日语） |
| 出海营销 | loongeva | `loongeva_v2` | 知性英文女（英式） |

### cosyvoice-v1 代表音色

基础音色，不支持方言/SSML/Instruct/时间戳。如：`longshuo`、`longjing`、`longmiao`、`loongstella` 等。

### Instruct 支持的情感值

支持 Instruct 的音色可设置以下情感：`neutral`、`fearful`、`angry`、`sad`、`surprised`、`happy`、`disgusted`

### Instruction 指令示例

v3.5-plus/v3.5-flash（自由指令）：
```
请用非常激昂且高亢的语气说话，表现出获得重大成功后的狂喜与激动。
语速请保持中等偏慢，语气要显得优雅、知性，给人以从容不迫的安心感。
```

v3-flash 复刻音色（自由指令）：
```
请用广东话表达。
请非常生气地说一句话。
请非常开心地说一句话。
用广播剧博客主的语气讲话。
```

---

## 10. 价格

| 模型 | 价格 | 限流 (RPS) |
|---|---|---|
| cosyvoice-v3.5-plus | 1.5 元/万字符 | 3 |
| cosyvoice-v3.5-flash | 0.8 元/万字符 | 3 |
| cosyvoice-v3-plus | 2 元/万字符 | 3 |
| cosyvoice-v3-flash | 1 元/万字符 | 20 |
| cosyvoice-v2 | 2 元/万字符 | 20 |
| cosyvoice-v1 | 1 元/万字符 | 20 |

- 声音复刻/设计的音色管理操作（创建/查询/更新/删除）：**免费**
- 使用复刻/设计音色进行合成：按上表计费

---

## 11. 接入方式

| 方式 | 说明 |
|---|---|
| Python SDK | `dashscope.audio.tts_v2.SpeechSynthesizer` |
| Java SDK | `com.alibaba.dashscope.audio.ttsv2.SpeechSynthesizer` |
| Android/iOS SDK | 移动端支持 |
| WebSocket API | 全双工流式通信，支持 Go/PHP/Node.js/Java/Python/C# |
| HTTP REST API | 非实时合成（仅北京地域） |

---

## 12. 参考链接

- [实时语音合成-CosyVoice/Sambert 用户指南](https://help.aliyun.com/zh/model-studio/text-to-speech)
- [CosyVoice 非实时 API 参考](https://help.aliyun.com/zh/model-studio/non-realtime-cosyvoice-api)
- [CosyVoice 音色列表](https://help.aliyun.com/zh/model-studio/cosyvoice-voice-list)
- [CosyVoice 声音复刻/设计 API](https://help.aliyun.com/zh/model-studio/cosyvoice-clone-design-api)
- [CosyVoice WebSocket API](https://help.aliyun.com/zh/model-studio/cosyvoice-websocket-api)
- [SSML 标记语言介绍](https://help.aliyun.com/zh/model-studio/introduction-to-cosyvoice-ssml-markup-language)
- [GitHub 示例代码](https://github.com/aliyun/alibabacloud-bailian-speech-demo)
