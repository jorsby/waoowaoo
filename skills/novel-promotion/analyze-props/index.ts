import { resolveInvalidatedArtifacts } from '@/lib/artifact-system/dependencies'
import { ARTIFACT_TYPES } from '@/lib/artifact-system/types'
import type { SkillPackage } from '@/lib/skill-system/types'
import { analyzePropsInputSchema, analyzePropsOutputSchema } from './schema'
import { analyzePropsResources } from './resources'
import { executeAnalyzeProps, type AnalyzePropsSkillInput } from './execute'
import { AnalyzePropsSkillRender } from './render'

const analyzePropsSkillPackage: SkillPackage = {
  kind: 'skill',
  metadata: {
    id: 'analyze-props',
    name: 'Analyze Props',
    summary: 'Extract normalized props from story text.',
    description: 'Run the prop analysis pass and produce structured prop artifacts.',
    riskLevel: 'low',
    scope: 'episode',
  },
  instructions: {
    documentPath: 'skills/novel-promotion/analyze-props/SKILL.md',
  },
  interface: {
    inputSchema: analyzePropsInputSchema,
    outputSchema: analyzePropsOutputSchema,
    inputArtifacts: [ARTIFACT_TYPES.STORY_RAW],
    outputArtifacts: [ARTIFACT_TYPES.ANALYSIS_PROPS],
  },
  resources: analyzePropsResources,
  effects: {
    mutationKind: 'generate',
    invalidates: resolveInvalidatedArtifacts(ARTIFACT_TYPES.ANALYSIS_PROPS),
    requiresApproval: false,
  },
  legacyStepIds: ['analyze_props'],
  execute: async (input) => await executeAnalyzeProps(input as AnalyzePropsSkillInput),
  render: AnalyzePropsSkillRender,
}

export default analyzePropsSkillPackage
