import { resolveInvalidatedArtifacts } from '@/lib/artifact-system/dependencies'
import { ARTIFACT_TYPES } from '@/lib/artifact-system/types'
import type { SkillPackage } from '@/lib/skill-system/types'
import { analyzeLocationsInputSchema, analyzeLocationsOutputSchema } from './schema'
import { analyzeLocationsResources } from './resources'
import { executeAnalyzeLocations, type AnalyzeLocationsSkillInput } from './execute'
import { AnalyzeLocationsSkillRender } from './render'

const analyzeLocationsSkillPackage: SkillPackage = {
  kind: 'skill',
  metadata: {
    id: 'analyze-locations',
    name: 'Analyze Locations',
    summary: 'Extract normalized locations from story text.',
    description: 'Run the location analysis pass and produce structured location artifacts.',
    riskLevel: 'low',
    scope: 'episode',
  },
  instructions: {
    documentPath: 'skills/novel-promotion/analyze-locations/SKILL.md',
  },
  interface: {
    inputSchema: analyzeLocationsInputSchema,
    outputSchema: analyzeLocationsOutputSchema,
    inputArtifacts: [ARTIFACT_TYPES.STORY_RAW],
    outputArtifacts: [ARTIFACT_TYPES.ANALYSIS_LOCATIONS],
  },
  resources: analyzeLocationsResources,
  effects: {
    mutationKind: 'generate',
    invalidates: resolveInvalidatedArtifacts(ARTIFACT_TYPES.ANALYSIS_LOCATIONS),
    requiresApproval: false,
  },
  legacyStepIds: ['analyze_locations'],
  execute: async (input) => await executeAnalyzeLocations(input as AnalyzeLocationsSkillInput),
  render: AnalyzeLocationsSkillRender,
}

export default analyzeLocationsSkillPackage
