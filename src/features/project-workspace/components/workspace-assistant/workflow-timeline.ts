'use client'

import type { UIMessage } from 'ai'
import {
  buildRunLifecycleCanonicalEvent,
  type WorkflowCanonicalEvent,
} from '@/lib/agent/events/workflow-events'
import {
  getProjectWorkflowMachine,
  getWorkflowDisplayLabel,
} from '@/lib/skill-system/project-workflow-machine'
import type { WorkspaceAssistantWorkflowEventDetail, WorkspaceAssistantWorkflowId } from './workspace-assistant-events'

function createLocalMessage(role: UIMessage['role'], parts: UIMessage['parts']): UIMessage {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    role,
    parts,
  }
}

function createAssistantMessage(parts: UIMessage['parts']): UIMessage {
  return createLocalMessage('assistant', parts)
}

function createSystemWorkflowMessage(parts: UIMessage['parts']): UIMessage {
  return createLocalMessage('assistant', parts)
}

export { createAssistantMessage, createLocalMessage, createSystemWorkflowMessage }

function isWorkflowStatusPart(
  part: UIMessage['parts'][number],
  workflowId: WorkspaceAssistantWorkflowId,
): boolean {
  return part.type === 'data-workflow-status'
    && typeof part.data === 'object'
    && part.data !== null
    && 'workflowId' in part.data
    && part.data.workflowId === workflowId
}

export function removeWorkflowStatusParts(messages: UIMessage[], workflowId: WorkspaceAssistantWorkflowId): UIMessage[] {
  return messages.flatMap((message) => {
    const nextParts = message.parts.filter((part) => !isWorkflowStatusPart(part, workflowId))
    if (nextParts.length === 0) return []
    return [{ ...message, parts: nextParts }]
  })
}

function resolveStatusCanonicalEvent(detail: {
  workflowId: WorkspaceAssistantWorkflowId
  status: 'start' | 'complete' | 'fail'
  runId?: string
}): WorkflowCanonicalEvent | null {
  if (!detail.runId) return null
  return buildRunLifecycleCanonicalEvent({
    workflowId: detail.workflowId,
    runId: detail.runId,
    status: detail.status,
  })
}

export function buildWorkflowTimelineMessages(workflowId: WorkspaceAssistantWorkflowId, runId?: string): UIMessage[] {
  const workflowMachine = getProjectWorkflowMachine(workflowId)
  const workflowLabel = getWorkflowDisplayLabel(workflowId)
  return [
    createSystemWorkflowMessage([
      {
        type: 'text',
        text: `系统已开始执行 ${workflowLabel}。接下来会在这里持续显示 workflow 和 skill 进度。`,
      },
      {
        type: 'data-workflow-plan',
        data: {
          workflowId,
          commandId: '',
          planId: '',
          summary: workflowMachine.manifest.name,
          requiresApproval: false,
          event: null,
          steps: workflowMachine.steps.map((step) => ({
            skillId: step.skillId,
            title: step.title,
          })),
        },
      },
      {
        type: 'data-workflow-status',
        data: {
          workflowId,
          commandId: '',
          planId: '',
          runId: runId || '',
          status: 'running',
          event: resolveStatusCanonicalEvent({
            workflowId,
            runId,
            status: 'start',
          }),
        },
      },
    ]),
  ]
}

export function buildWorkflowErrorMessage(detail: WorkspaceAssistantWorkflowEventDetail): UIMessage {
  const workflowLabel = getWorkflowDisplayLabel(detail.workflowId)
  return createSystemWorkflowMessage([
    {
      type: 'text',
      text: `${workflowLabel} 启动失败：${detail.errorMessage || '未知错误'}`,
    },
    {
      type: 'data-workflow-status',
      data: {
        workflowId: detail.workflowId,
        commandId: '',
        planId: '',
        runId: detail.runId || '',
        status: 'failed',
        event: detail.canonicalEvent || resolveStatusCanonicalEvent({
          workflowId: detail.workflowId,
          runId: detail.runId,
          status: 'fail',
        }),
      },
    },
  ])
}

export function buildWorkflowCompletedMessage(workflowId: WorkspaceAssistantWorkflowId, runId?: string): UIMessage {
  const workflowLabel = getWorkflowDisplayLabel(workflowId)
  return createSystemWorkflowMessage([
    {
      type: 'text',
      text: `${workflowLabel} 已执行完成。`,
    },
    {
      type: 'data-workflow-status',
      data: {
        workflowId,
        commandId: '',
        planId: '',
        runId: runId || '',
        status: 'completed',
        event: resolveStatusCanonicalEvent({
          workflowId,
          runId,
          status: 'complete',
        }),
      },
    },
  ])
}
