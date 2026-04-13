import { resolveInvalidatedArtifacts } from '@/lib/artifact-system/dependencies'
import { ARTIFACT_TYPES } from '@/lib/artifact-system/types'
import type { SkillPackage } from '@/lib/skill-system/types'
import { analyzeCharactersInputSchema, analyzeCharactersOutputSchema } from './schema'
import { analyzeCharactersResources } from './resources'
import { executeAnalyzeCharacters, type AnalyzeCharactersSkillInput } from './execute'
import { AnalyzeCharactersSkillRender } from './render'

const analyzeCharactersSkillPackage: SkillPackage = {
  kind: 'skill',
  metadata: {
    id: 'analyze-characters',
    name: 'Analyze Characters',
    summary: 'Extract normalized characters from story text.',
    description: 'Run the character analysis pass and produce structured character artifacts.',
    riskLevel: 'low',
    scope: 'episode',
  },
  instructions: {
    documentPath: 'skills/novel-promotion/analyze-characters/SKILL.md',
  },
  interface: {
    inputSchema: analyzeCharactersInputSchema,
    outputSchema: analyzeCharactersOutputSchema,
    inputArtifacts: [ARTIFACT_TYPES.STORY_RAW],
    outputArtifacts: [ARTIFACT_TYPES.ANALYSIS_CHARACTERS],
  },
  resources: analyzeCharactersResources,
  effects: {
    mutationKind: 'generate',
    invalidates: resolveInvalidatedArtifacts(ARTIFACT_TYPES.ANALYSIS_CHARACTERS),
    requiresApproval: false,
  },
  legacyStepIds: ['analyze_characters'],
  execute: async (input) => await executeAnalyzeCharacters(input as AnalyzeCharactersSkillInput),
  render: AnalyzeCharactersSkillRender,
}

export default analyzeCharactersSkillPackage
