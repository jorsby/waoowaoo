import { describe, expect, it } from 'vitest'
import { buildAssistantProjectContextSnapshot, buildWorkflowApprovalReasons, buildWorkflowApprovalSummary, buildWorkflowPlanSummary } from '@/lib/project-agent/presentation'
import type { ProjectContextSnapshot } from '@/lib/project-context/types'
import type { PlanStep } from '@/lib/command-center/types'

describe('project agent presentation', () => {
  it('builds assistant project context snapshot from policy config', () => {
    const snapshot = buildAssistantProjectContextSnapshot({
      projectId: 'project-1',
      projectName: 'a',
      episodeId: 'episode-1',
      episodeName: '剧集 1',
      currentStage: 'config',
      selectedScopeRef: null,
      latestArtifacts: [],
      activeRuns: [],
      policy: {
        projectId: 'project-1',
        episodeId: 'episode-1',
        videoRatio: '9:16',
        artStyle: 'realistic',
        analysisModel: 'google::gemini-3.1-flash-lite-preview',
        overrides: {},
      },
    } satisfies ProjectContextSnapshot)

    expect(snapshot.config).toEqual({
      analysisModel: 'google::gemini-3.1-flash-lite-preview',
      artStyle: 'realistic',
      videoRatio: '9:16',
    })
  })

  it('builds concise chinese approval reasons instead of raw invalidation dumps', () => {
    const reasons = buildWorkflowApprovalReasons([
      {
        stepKey: 's1',
        skillId: 'analyze-characters',
        title: 'Analyze Characters',
        orderIndex: 0,
        inputArtifacts: [],
        outputArtifacts: [],
        invalidates: ['clip.screenplay', 'storyboard.phase1', 'voice.lines'],
        mutationKind: 'generate',
        riskLevel: 'high',
        requiresApproval: true,
        dependsOn: [],
      },
    ] satisfies PlanStep[])

    expect(reasons).toEqual([
      '会覆盖现有剧本结果。',
      '现有分镜相关结果会失效，需要重新生成。',
      '现有台词结果会失效。',
    ])
  })

  it('returns localized workflow summaries', () => {
    expect(buildWorkflowPlanSummary('story-to-script')).toBe('故事到剧本执行计划')
    expect(buildWorkflowApprovalSummary('script-to-storyboard')).toBe('该流程会基于剧本重新生成分镜与台词结果。')
  })
})
