import { resolveInvalidatedArtifacts } from '@/lib/artifact-system/dependencies'
import { ARTIFACT_TYPES } from '@/lib/artifact-system/types'
import type { SkillPackage } from '@/lib/skill-system/types'
import { generateScreenplayInputSchema, generateScreenplayOutputSchema } from './schema'
import { generateScreenplayResources } from './resources'
import { executeGenerateScreenplay, type GenerateScreenplaySkillInput } from './execute'
import { GenerateScreenplaySkillRender } from './render'

const generateScreenplaySkillPackage: SkillPackage = {
  kind: 'skill',
  metadata: {
    id: 'generate-screenplay',
    name: 'Generate Screenplay',
    summary: 'Generate screenplay scenes for each clip.',
    description: 'Transform split clips into screenplay scene JSON while preserving upstream analysis context.',
    riskLevel: 'low',
    scope: 'episode',
  },
  instructions: {
    documentPath: 'skills/novel-promotion/generate-screenplay/SKILL.md',
  },
  interface: {
    inputSchema: generateScreenplayInputSchema,
    outputSchema: generateScreenplayOutputSchema,
    inputArtifacts: [ARTIFACT_TYPES.CLIP_SPLIT],
    outputArtifacts: [ARTIFACT_TYPES.CLIP_SCREENPLAY],
  },
  resources: generateScreenplayResources,
  effects: {
    mutationKind: 'generate',
    invalidates: resolveInvalidatedArtifacts(ARTIFACT_TYPES.CLIP_SCREENPLAY),
    requiresApproval: false,
  },
  legacyStepIds: ['generate_screenplay'],
  execute: async (input) => await executeGenerateScreenplay(input as GenerateScreenplaySkillInput),
  render: GenerateScreenplaySkillRender,
}

export default generateScreenplaySkillPackage
