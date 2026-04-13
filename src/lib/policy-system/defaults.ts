import type { PolicySnapshot } from './types'

export const DEFAULT_POLICY_VALUES = {
  videoRatio: '9:16',
  artStyle: 'american-comic',
} as const

export function createDefaultPolicy(projectId: string, episodeId?: string | null): PolicySnapshot {
  return {
    projectId,
    episodeId: episodeId || null,
    videoRatio: DEFAULT_POLICY_VALUES.videoRatio,
    artStyle: DEFAULT_POLICY_VALUES.artStyle,
    analysisModel: null,
    overrides: {},
  }
}
