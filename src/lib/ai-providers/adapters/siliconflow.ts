import type { AiMediaAdapter } from '@/lib/ai-registry/types'
import { describeMediaVariantBase } from './shared'

export const siliconFlowMediaAdapter: AiMediaAdapter = {
  providerKey: 'siliconflow',
  describeVariant(modality, selection) {
    return describeMediaVariantBase({
      modality,
      selection,
      executionMode: modality === 'video' ? 'async' : 'sync',
    })
  },
}

