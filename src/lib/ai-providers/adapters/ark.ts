import type { AiMediaAdapter } from '@/lib/ai-registry/types'
import { describeMediaVariantBase } from './shared'

export const arkMediaAdapter: AiMediaAdapter = {
  providerKey: 'ark',
  describeVariant(modality, selection) {
    const executionMode = modality === 'video'
      ? (selection.modelId.endsWith('-batch') ? 'batch' : 'async')
      : 'sync'
    return describeMediaVariantBase({
      modality,
      selection,
      executionMode,
    })
  },
}

