import { executePlanStoryboardPhase1Skill } from '@skills/novel-promotion/_shared/script-to-storyboard-skills'

export type PlanStoryboardPhase1SkillInput = Parameters<typeof executePlanStoryboardPhase1Skill>[0]

export async function executePlanStoryboardPhase1(input: PlanStoryboardPhase1SkillInput) {
  return await executePlanStoryboardPhase1Skill(input)
}
