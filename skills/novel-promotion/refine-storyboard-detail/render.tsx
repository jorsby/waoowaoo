import { SkillResultCard } from '@skills/novel-promotion/_shared/render'

export function RefineStoryboardDetailSkillRender(props: { data: unknown }) {
  return (
    <SkillResultCard
      title="Refine Storyboard Detail"
      subtitle="镜头细化 skill 的最终 panel 输出"
      data={props.data}
    />
  )
}
