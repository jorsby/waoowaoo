'use client'

export type WorkspaceAssistantWorkflowId = 'story-to-script' | 'script-to-storyboard'

export type WorkspaceAssistantWorkflowEventDetail = {
  status: 'started' | 'completed' | 'failed'
  workflowId: WorkspaceAssistantWorkflowId
  errorMessage?: string
}

export const WORKSPACE_ASSISTANT_WORKFLOW_EVENT = 'workspace-assistant:workflow'

export function emitWorkspaceAssistantWorkflowEvent(detail: WorkspaceAssistantWorkflowEventDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<WorkspaceAssistantWorkflowEventDetail>(
    WORKSPACE_ASSISTANT_WORKFLOW_EVENT,
    { detail },
  ))
}
