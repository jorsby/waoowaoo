import { resolveInvalidatedArtifacts } from '@/lib/artifact-system/dependencies'
import { ARTIFACT_TYPES } from '@/lib/artifact-system/types'
import type { SkillPackage } from '@/lib/skill-system/types'
import { splitClipsInputSchema, splitClipsOutputSchema } from './schema'
import { splitClipsResources } from './resources'
import { executeSplitClips, type SplitClipsSkillInput } from './execute'
import { SplitClipsSkillRender } from './render'

const splitClipsSkillPackage: SkillPackage = {
  kind: 'skill',
  metadata: {
    id: 'split-clips',
    name: 'Split Clips',
    summary: 'Split story text into ordered clip units.',
    description: 'Use upstream analysis artifacts to produce valid clip boundaries and summaries.',
    riskLevel: 'low',
    scope: 'episode',
  },
  instructions: {
    documentPath: 'skills/novel-promotion/split-clips/SKILL.md',
  },
  interface: {
    inputSchema: splitClipsInputSchema,
    outputSchema: splitClipsOutputSchema,
    inputArtifacts: [
      ARTIFACT_TYPES.STORY_RAW,
      ARTIFACT_TYPES.ANALYSIS_CHARACTERS,
      ARTIFACT_TYPES.ANALYSIS_LOCATIONS,
      ARTIFACT_TYPES.ANALYSIS_PROPS,
    ],
    outputArtifacts: [ARTIFACT_TYPES.CLIP_SPLIT],
  },
  resources: splitClipsResources,
  effects: {
    mutationKind: 'generate',
    invalidates: resolveInvalidatedArtifacts(ARTIFACT_TYPES.CLIP_SPLIT),
    requiresApproval: false,
  },
  legacyStepIds: ['split_clips'],
  execute: async (input) => await executeSplitClips(input as SplitClipsSkillInput),
  render: SplitClipsSkillRender,
}

export default splitClipsSkillPackage
