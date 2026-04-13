import { resolveInvalidatedArtifacts } from '@/lib/artifact-system/dependencies'
import { ARTIFACT_TYPES } from '@/lib/artifact-system/types'
import type { SkillPackage } from '@/lib/skill-system/types'
import { refineActingInputSchema, refineActingOutputSchema } from './schema'
import { refineActingResources } from './resources'
import { executeRefineActing, type RefineActingSkillInput } from './execute'
import { RefineActingSkillRender } from './render'

const refineActingSkillPackage: SkillPackage = {
  kind: 'skill',
  metadata: {
    id: 'refine-acting',
    name: 'Refine Acting',
    summary: 'Add acting direction to storyboard panels.',
    description: 'Generate per-panel acting notes after phase 1 planning.',
    riskLevel: 'medium',
    scope: 'episode',
  },
  instructions: {
    documentPath: 'skills/novel-promotion/refine-acting/SKILL.md',
  },
  interface: {
    inputSchema: refineActingInputSchema,
    outputSchema: refineActingOutputSchema,
    inputArtifacts: [ARTIFACT_TYPES.STORYBOARD_PHASE1],
    outputArtifacts: [ARTIFACT_TYPES.STORYBOARD_PHASE2_ACTING],
  },
  resources: refineActingResources,
  effects: {
    mutationKind: 'generate',
    invalidates: resolveInvalidatedArtifacts(ARTIFACT_TYPES.STORYBOARD_PHASE2_ACTING),
    requiresApproval: false,
  },
  legacyStepIds: ['refine_acting'],
  execute: async (input) => await executeRefineActing(input as RefineActingSkillInput),
  render: RefineActingSkillRender,
}

export default refineActingSkillPackage
