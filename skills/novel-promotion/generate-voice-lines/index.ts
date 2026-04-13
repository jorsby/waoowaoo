import { ARTIFACT_TYPES } from '@/lib/artifact-system/types'
import type { SkillPackage } from '@/lib/skill-system/types'
import { generateVoiceLinesInputSchema, generateVoiceLinesOutputSchema } from './schema'
import { generateVoiceLinesResources } from './resources'
import { executeGenerateVoiceLines, type GenerateVoiceLinesSkillInput } from './execute'
import { GenerateVoiceLinesSkillRender } from './render'

const generateVoiceLinesSkillPackage: SkillPackage = {
  kind: 'skill',
  metadata: {
    id: 'generate-voice-lines',
    name: 'Generate Voice Lines',
    summary: 'Generate voice lines aligned to final storyboard panels.',
    description: 'Create structured voice lines from the final storyboard output.',
    riskLevel: 'medium',
    scope: 'episode',
  },
  instructions: {
    documentPath: 'skills/novel-promotion/generate-voice-lines/SKILL.md',
  },
  interface: {
    inputSchema: generateVoiceLinesInputSchema,
    outputSchema: generateVoiceLinesOutputSchema,
    inputArtifacts: [ARTIFACT_TYPES.STORYBOARD_PANEL_SET],
    outputArtifacts: [ARTIFACT_TYPES.VOICE_LINES],
  },
  resources: generateVoiceLinesResources,
  effects: {
    mutationKind: 'generate',
    invalidates: [],
    requiresApproval: false,
  },
  legacyStepIds: ['generate_voice_lines', 'voice_analyze'],
  execute: async (input) => await executeGenerateVoiceLines(input as GenerateVoiceLinesSkillInput),
  render: GenerateVoiceLinesSkillRender,
}

export default generateVoiceLinesSkillPackage
