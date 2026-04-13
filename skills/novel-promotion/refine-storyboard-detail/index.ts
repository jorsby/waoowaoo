import { resolveInvalidatedArtifacts } from '@/lib/artifact-system/dependencies'
import { ARTIFACT_TYPES } from '@/lib/artifact-system/types'
import type { SkillPackage } from '@/lib/skill-system/types'
import { refineStoryboardDetailInputSchema, refineStoryboardDetailOutputSchema } from './schema'
import { refineStoryboardDetailResources } from './resources'
import { executeRefineStoryboardDetail, type RefineStoryboardDetailSkillInput } from './execute'
import { RefineStoryboardDetailSkillRender } from './render'

const refineStoryboardDetailSkillPackage: SkillPackage = {
  kind: 'skill',
  metadata: {
    id: 'refine-storyboard-detail',
    name: 'Refine Storyboard Detail',
    summary: 'Produce the final detailed storyboard panel set.',
    description: 'Merge phase-1 panels with phase-2 guidance into detailed final panels.',
    riskLevel: 'medium',
    scope: 'episode',
  },
  instructions: {
    documentPath: 'skills/novel-promotion/refine-storyboard-detail/SKILL.md',
  },
  interface: {
    inputSchema: refineStoryboardDetailInputSchema,
    outputSchema: refineStoryboardDetailOutputSchema,
    inputArtifacts: [
      ARTIFACT_TYPES.STORYBOARD_PHASE1,
      ARTIFACT_TYPES.STORYBOARD_PHASE2_CINEMATOGRAPHY,
      ARTIFACT_TYPES.STORYBOARD_PHASE2_ACTING,
    ],
    outputArtifacts: [
      ARTIFACT_TYPES.STORYBOARD_PHASE3_DETAIL,
      ARTIFACT_TYPES.STORYBOARD_PANEL_SET,
    ],
  },
  resources: refineStoryboardDetailResources,
  effects: {
    mutationKind: 'generate',
    invalidates: resolveInvalidatedArtifacts(ARTIFACT_TYPES.STORYBOARD_PHASE3_DETAIL),
    requiresApproval: false,
  },
  legacyStepIds: ['refine_storyboard_detail'],
  execute: async (input) => await executeRefineStoryboardDetail(input as RefineStoryboardDetailSkillInput),
  render: RefineStoryboardDetailSkillRender,
}

export default refineStoryboardDetailSkillPackage
