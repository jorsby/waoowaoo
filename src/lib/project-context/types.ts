import type { PolicySnapshot } from '@/lib/policy-system/types'

export interface ProjectContextArtifactSummary {
  type: string
  refId: string
  createdAt?: string | null
}

export interface ProjectContextRunSummary {
  id: string
  workflowType: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface ProjectContextSnapshot {
  projectId: string
  projectName: string
  episodeId?: string | null
  episodeName?: string | null
  currentStage?: string | null
  selectedScopeRef?: string | null
  latestArtifacts: ProjectContextArtifactSummary[]
  activeRuns: ProjectContextRunSummary[]
  policy: PolicySnapshot
}
