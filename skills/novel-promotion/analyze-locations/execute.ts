import { executeAnalyzeLocationsSkill } from '@skills/novel-promotion/_shared/story-to-script-skills'

export type AnalyzeLocationsSkillInput = Parameters<typeof executeAnalyzeLocationsSkill>[0]

export async function executeAnalyzeLocations(input: AnalyzeLocationsSkillInput) {
  return await executeAnalyzeLocationsSkill(input)
}
