import { SkillResultCard } from '@skills/novel-promotion/_shared/render'

export function PlanStoryboardPhase1SkillRender(props: { data: unknown }) {
  return (
    <SkillResultCard
      title="Plan Storyboard Phase 1"
      subtitle="分镜一期规划 skill 的 panel 输出"
      data={props.data}
    />
  )
}
