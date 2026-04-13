import { WorkflowResultCard } from '@skills/novel-promotion/_shared/render'

export function ScriptToStoryboardWorkflowRender(props: { data: unknown }) {
  return (
    <WorkflowResultCard
      title="Script To Storyboard Workflow"
      summary="固定串行 workflow package：先规划分镜，再细化，再生成台词"
      skills={[
        'plan-storyboard-phase1',
        'refine-cinematography',
        'refine-acting',
        'refine-storyboard-detail',
        'generate-voice-lines',
      ]}
      data={props.data}
    />
  )
}
