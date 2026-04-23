import type { AiMediaAdapter } from '@/lib/ai-registry/types'
import { describeMediaVariantBase } from './shared'

function createGeneratorBackedAdapter(
  providerKey: 'fal' | 'minimax' | 'vidu',
  videoMode: 'async' | 'batch',
): AiMediaAdapter {
  return {
    providerKey,
    describeVariant(modality, selection) {
      return describeMediaVariantBase({
        modality,
        selection,
        executionMode: modality === 'video' ? videoMode : 'sync',
      })
    },
  }
}

export const falMediaAdapter = createGeneratorBackedAdapter('fal', 'async')
export const minimaxMediaAdapter = createGeneratorBackedAdapter('minimax', 'async')
export const viduMediaAdapter = createGeneratorBackedAdapter('vidu', 'async')

