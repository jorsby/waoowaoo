export interface PolicySnapshot {
  projectId: string
  episodeId?: string | null
  videoRatio: string
  artStyle: string
  analysisModel?: string | null
  overrides: Record<string, unknown>
}

export interface PolicyOverrideInput {
  videoRatio?: string
  artStyle?: string
  analysisModel?: string | null
  overrides?: Record<string, unknown>
}
