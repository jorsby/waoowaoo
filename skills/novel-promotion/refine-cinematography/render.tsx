import { SkillResultCard } from '@skills/novel-promotion/_shared/render'

export function RefineCinematographySkillRender(props: { data: unknown }) {
  return (
    <SkillResultCard
      title="Refine Cinematography"
      subtitle="摄影规则 skill 的结构化输出"
      data={props.data}
    />
  )
}
