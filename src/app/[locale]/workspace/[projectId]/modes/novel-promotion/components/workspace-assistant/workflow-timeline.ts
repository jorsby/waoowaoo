'use client'

import type { UIMessage } from 'ai'
import type { WorkspaceAssistantWorkflowEventDetail, WorkspaceAssistantWorkflowId } from './workspace-assistant-events'

const WORKFLOW_LABELS: Record<WorkspaceAssistantWorkflowId, string> = {
  'story-to-script': '故事 -> 剧本',
  'script-to-storyboard': '剧本 -> 分镜',
}

const WORKFLOW_SUMMARIES: Record<WorkspaceAssistantWorkflowId, string> = {
  'story-to-script': 'Story To Script',
  'script-to-storyboard': 'Script To Storyboard',
}

const WORKFLOW_STEPS: Record<WorkspaceAssistantWorkflowId, Array<{ skillId: string; title: string }>> = {
  'story-to-script': [
    { skillId: 'analyze-characters', title: 'Analyze Characters' },
    { skillId: 'analyze-locations', title: 'Analyze Locations' },
    { skillId: 'analyze-props', title: 'Analyze Props' },
    { skillId: 'split-clips', title: 'Split Clips' },
    { skillId: 'generate-screenplay', title: 'Generate Screenplay' },
  ],
  'script-to-storyboard': [
    { skillId: 'plan-storyboard-phase1', title: 'Plan Storyboard Phase 1' },
    { skillId: 'refine-cinematography', title: 'Refine Cinematography' },
    { skillId: 'refine-acting', title: 'Refine Acting' },
    { skillId: 'refine-storyboard-detail', title: 'Refine Storyboard Detail' },
    { skillId: 'generate-voice-lines', title: 'Generate Voice Lines' },
  ],
}

function createLocalMessage(role: UIMessage['role'], parts: UIMessage['parts']): UIMessage {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    role,
    parts,
  }
}

export { createLocalMessage }

export function buildWorkflowTimelineMessages(workflowId: WorkspaceAssistantWorkflowId): UIMessage[] {
  return [
    createLocalMessage('user', [
      {
        type: 'text',
        text: `开始执行 ${WORKFLOW_LABELS[workflowId]}`,
      },
    ]),
    createLocalMessage('assistant', [
      {
        type: 'text',
        text: `已从工作区触发 ${WORKFLOW_LABELS[workflowId]}。接下来会在这里持续显示 workflow 和 skill 进度。`,
      },
      {
        type: 'data-workflow-plan',
        data: {
          workflowId,
          commandId: '',
          planId: '',
          summary: WORKFLOW_SUMMARIES[workflowId],
          requiresApproval: false,
          steps: WORKFLOW_STEPS[workflowId],
        },
      },
      {
        type: 'data-workflow-status',
        data: {
          workflowId,
          commandId: '',
          planId: '',
          runId: '',
          status: 'running',
        },
      },
    ]),
  ]
}

export function buildWorkflowErrorMessage(detail: WorkspaceAssistantWorkflowEventDetail): UIMessage {
  return createLocalMessage('assistant', [
    {
      type: 'text',
      text: `${WORKFLOW_LABELS[detail.workflowId]} 启动失败：${detail.errorMessage || '未知错误'}`,
    },
  ])
}

export function buildWorkflowCompletedMessage(workflowId: WorkspaceAssistantWorkflowId): UIMessage {
  return createLocalMessage('assistant', [
    {
      type: 'text',
      text: `${WORKFLOW_LABELS[workflowId]} 已执行完成。`,
    },
    {
      type: 'data-workflow-status',
      data: {
        workflowId,
        commandId: '',
        planId: '',
        runId: '',
        status: 'completed',
      },
    },
  ])
}
