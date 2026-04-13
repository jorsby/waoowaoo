import { resolveInvalidatedArtifacts } from '@/lib/artifact-system/dependencies'
import { ARTIFACT_TYPES } from '@/lib/artifact-system/types'
import type { SkillPackage } from '@/lib/skill-system/types'
import { planStoryboardPhase1InputSchema, planStoryboardPhase1OutputSchema } from './schema'
import { planStoryboardPhase1Resources } from './resources'
import { executePlanStoryboardPhase1, type PlanStoryboardPhase1SkillInput } from './execute'
import { PlanStoryboardPhase1SkillRender } from './render'

const planStoryboardPhase1SkillPackage: SkillPackage = {
  kind: 'skill',
  metadata: {
    id: 'plan-storyboard-phase1',
    name: 'Plan Storyboard Phase 1',
    summary: 'Create first-pass storyboard panels from screenplay clips.',
    description: 'Generate the initial storyboard plan per clip.',
    riskLevel: 'medium',
    scope: 'episode',
  },
  instructions: {
    documentPath: 'skills/novel-promotion/plan-storyboard-phase1/SKILL.md',
  },
  interface: {
    inputSchema: planStoryboardPhase1InputSchema,
    outputSchema: planStoryboardPhase1OutputSchema,
    inputArtifacts: [ARTIFACT_TYPES.CLIP_SCREENPLAY],
    outputArtifacts: [ARTIFACT_TYPES.STORYBOARD_PHASE1],
  },
  resources: planStoryboardPhase1Resources,
  effects: {
    mutationKind: 'generate',
    invalidates: resolveInvalidatedArtifacts(ARTIFACT_TYPES.STORYBOARD_PHASE1),
    requiresApproval: false,
  },
  legacyStepIds: ['plan_storyboard_phase1'],
  execute: async (input) => await executePlanStoryboardPhase1(input as PlanStoryboardPhase1SkillInput),
  render: PlanStoryboardPhase1SkillRender,
}

export default planStoryboardPhase1SkillPackage
