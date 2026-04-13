import { executeAnalyzeCharactersSkill } from '@skills/novel-promotion/_shared/story-to-script-skills'

export type AnalyzeCharactersSkillInput = Parameters<typeof executeAnalyzeCharactersSkill>[0]

export async function executeAnalyzeCharacters(input: AnalyzeCharactersSkillInput) {
  return await executeAnalyzeCharactersSkill(input)
}
