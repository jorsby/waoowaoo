import { executeRefineCinematographySkill } from '@skills/novel-promotion/_shared/script-to-storyboard-skills'

export type RefineCinematographySkillInput = Parameters<typeof executeRefineCinematographySkill>[0]

export async function executeRefineCinematography(input: RefineCinematographySkillInput) {
  return await executeRefineCinematographySkill(input)
}
