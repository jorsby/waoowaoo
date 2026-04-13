import { SkillResultCard } from '@skills/novel-promotion/_shared/render'

export function GenerateVoiceLinesSkillRender(props: { data: unknown }) {
  return (
    <SkillResultCard
      title="Generate Voice Lines"
      subtitle="台词生成 skill 的结构化输出"
      data={props.data}
    />
  )
}
