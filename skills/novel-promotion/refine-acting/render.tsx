import { SkillResultCard } from '@skills/novel-promotion/_shared/render'

export function RefineActingSkillRender(props: { data: unknown }) {
  return (
    <SkillResultCard
      title="Refine Acting"
      subtitle="表演指导 skill 的结构化输出"
      data={props.data}
    />
  )
}
