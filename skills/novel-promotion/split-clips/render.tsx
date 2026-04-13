import { SkillResultCard } from '@skills/novel-promotion/_shared/render'

export function SplitClipsSkillRender(props: { data: unknown }) {
  return (
    <SkillResultCard
      title="Split Clips"
      subtitle="片段切分 skill 的边界和 clip 输出"
      data={props.data}
    />
  )
}
