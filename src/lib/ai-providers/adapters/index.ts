import { AiRegistry } from '@/lib/ai-registry/registry'
import type { AiMediaAdapter, AiResolvedMediaSelection } from '@/lib/ai-registry/types'
import { arkMediaAdapter } from './ark'
import { bailianMediaAdapter } from './bailian'
import { falMediaAdapter, minimaxMediaAdapter, viduMediaAdapter } from './generator-backed'
import { geminiCompatibleMediaAdapter, googleMediaAdapter } from './google'
import { openAiCompatibleMediaAdapter } from './openai-compatible'
import { siliconFlowMediaAdapter } from './siliconflow'

const mediaAdapters: AiMediaAdapter[] = [
  bailianMediaAdapter,
  siliconFlowMediaAdapter,
  openAiCompatibleMediaAdapter,
  googleMediaAdapter,
  geminiCompatibleMediaAdapter,
  arkMediaAdapter,
  falMediaAdapter,
  minimaxMediaAdapter,
  viduMediaAdapter,
]

const mediaRegistry = new AiRegistry<AiMediaAdapter>(mediaAdapters)

export function resolveMediaAdapter(selection: AiResolvedMediaSelection): AiMediaAdapter {
  return mediaRegistry.getAdapterByProviderId(selection.provider) as AiMediaAdapter
}
