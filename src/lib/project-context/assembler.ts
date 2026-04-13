import { prisma } from '@/lib/prisma'
import { listRuns } from '@/lib/run-runtime/service'
import { resolvePolicy } from '@/lib/policy-system/resolver'
import type { ProjectContextSnapshot } from './types'

export async function assembleProjectContext(params: {
  projectId: string
  userId: string
  episodeId?: string | null
  currentStage?: string | null
  selectedScopeRef?: string | null
}): Promise<ProjectContextSnapshot> {
  const [project, episode, runs] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        novelPromotionData: true,
      },
    }),
    params.episodeId
      ? prisma.novelPromotionEpisode.findUnique({
          where: { id: params.episodeId },
        })
      : Promise.resolve(null),
    listRuns({
      userId: params.userId,
      projectId: params.projectId,
      episodeId: params.episodeId || undefined,
      statuses: ['queued', 'running', 'canceling'],
      limit: 10,
    }),
  ])

  if (!project || !project.novelPromotionData) {
    throw new Error(`PROJECT_CONTEXT_NOT_FOUND: ${params.projectId}`)
  }

  const policy = resolvePolicy({
    projectId: params.projectId,
    episodeId: params.episodeId || null,
    projectPolicy: {
      projectId: params.projectId,
      episodeId: params.episodeId || null,
      videoRatio: project.novelPromotionData.videoRatio,
      artStyle: project.novelPromotionData.artStyle,
      analysisModel: project.novelPromotionData.analysisModel,
      overrides: {},
    },
  })

  return {
    projectId: project.id,
    projectName: project.name,
    episodeId: episode?.id || null,
    episodeName: episode?.name || null,
    currentStage: params.currentStage || null,
    selectedScopeRef: params.selectedScopeRef || null,
    latestArtifacts: [],
    activeRuns: runs.map((run) => ({
      id: run.id,
      workflowType: run.workflowType,
      status: run.status,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    })),
    policy,
  }
}
