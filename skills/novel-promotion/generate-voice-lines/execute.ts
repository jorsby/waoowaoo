import { executeVoiceLinesWithRetry } from '@skills/novel-promotion/_shared/script-to-storyboard-runtime'

export type GenerateVoiceLinesSkillInput = Parameters<typeof executeVoiceLinesWithRetry>[0]

export async function executeGenerateVoiceLines(input: GenerateVoiceLinesSkillInput) {
  return await executeVoiceLinesWithRetry(input)
}
