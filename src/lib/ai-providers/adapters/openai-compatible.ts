import type { AiMediaAdapter } from '@/lib/ai-registry/types'
import { describeMediaVariantBase } from './shared'

export const openAiCompatibleMediaAdapter: AiMediaAdapter = {
  providerKey: 'openai-compatible',
  describeVariant(modality, selection) {
    return describeMediaVariantBase({
      modality,
      selection,
      executionMode: selection.compatMediaTemplate?.mode === 'async' ? 'async' : 'sync',
    })
  },
}

