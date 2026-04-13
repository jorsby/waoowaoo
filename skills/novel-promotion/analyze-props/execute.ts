import { executeAnalyzePropsSkill } from '@skills/novel-promotion/_shared/story-to-script-skills'

export type AnalyzePropsSkillInput = Parameters<typeof executeAnalyzePropsSkill>[0]

export async function executeAnalyzeProps(input: AnalyzePropsSkillInput) {
  return await executeAnalyzePropsSkill(input)
}
