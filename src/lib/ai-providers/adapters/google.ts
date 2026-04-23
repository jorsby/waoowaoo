import type { AiMediaAdapter } from '@/lib/ai-registry/types'
import { describeMediaVariantBase } from './shared'

export const googleMediaAdapter: AiMediaAdapter = {
  providerKey: 'google',
  describeVariant(modality, selection) {
    const executionMode = modality === 'image' && selection.modelId === 'gemini-3-pro-image-preview-batch'
      ? 'batch'
      : modality === 'video'
        ? 'async'
        : 'sync'
    return describeMediaVariantBase({
      modality,
      selection,
      executionMode,
    })
  },
}

export const geminiCompatibleMediaAdapter: AiMediaAdapter = {
  providerKey: 'gemini-compatible',
  describeVariant(modality, selection) {
    return describeMediaVariantBase({
      modality,
      selection,
      executionMode: modality === 'video' ? 'async' : 'sync',
    })
  },
}

