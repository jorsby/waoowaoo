import { SkillResultCard } from '@skills/novel-promotion/_shared/render'

export function GenerateScreenplaySkillRender(props: { data: unknown }) {
  return (
    <SkillResultCard
      title="Generate Screenplay"
      subtitle="剧本生成 skill 的 clip 级输出"
      data={props.data}
    />
  )
}
