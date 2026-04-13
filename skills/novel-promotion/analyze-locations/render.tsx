import { SkillResultCard } from '@skills/novel-promotion/_shared/render'

export function AnalyzeLocationsSkillRender(props: { data: unknown }) {
  return (
    <SkillResultCard
      title="Analyze Locations"
      subtitle="场景分析 skill 的结构化输出"
      data={props.data}
    />
  )
}
