import { WorkflowResultCard } from '@skills/novel-promotion/_shared/render'

export function StoryToScriptWorkflowRender(props: { data: unknown }) {
  return (
    <WorkflowResultCard
      title="Story To Script Workflow"
      summary="固定串行 workflow package：先分析，再切片，再生成剧本"
      skills={[
        'analyze-characters',
        'analyze-locations',
        'analyze-props',
        'split-clips',
        'generate-screenplay',
      ]}
      data={props.data}
    />
  )
}
