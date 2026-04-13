import { SkillResultCard } from '@skills/novel-promotion/_shared/render'

export function AnalyzePropsSkillRender(props: { data: unknown }) {
  return (
    <SkillResultCard
      title="Analyze Props"
      subtitle="道具分析 skill 的结构化输出"
      data={props.data}
    />
  )
}
