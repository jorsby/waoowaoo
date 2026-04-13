import { SkillResultCard } from '@skills/novel-promotion/_shared/render'

export function AnalyzeCharactersSkillRender(props: { data: unknown }) {
  return (
    <SkillResultCard
      title="Analyze Characters"
      subtitle="角色分析 skill 的结构化输出"
      data={props.data}
    />
  )
}
