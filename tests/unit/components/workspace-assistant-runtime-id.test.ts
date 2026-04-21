import { describe, expect, it } from 'vitest'
import { buildWorkspaceAssistantChatId } from '@/features/project-workspace/components/workspace-assistant/useWorkspaceAssistantRuntime'

describe('workspace assistant runtime chat id', () => {
  it('includes interaction mode so mode switch recreates chat session', () => {
    const autoId = buildWorkspaceAssistantChatId({
      projectId: 'project-1',
      episodeId: 'episode-1',
      interactionMode: 'auto',
    })
    const fastId = buildWorkspaceAssistantChatId({
      projectId: 'project-1',
      episodeId: 'episode-1',
      interactionMode: 'fast',
    })
    const planId = buildWorkspaceAssistantChatId({
      projectId: 'project-1',
      episodeId: 'episode-1',
      interactionMode: 'plan',
    })

    expect(autoId).toBe('workspace-command:project-1:episode-1:auto')
    expect(fastId).toBe('workspace-command:project-1:episode-1:fast')
    expect(planId).toBe('workspace-command:project-1:episode-1:plan')
    expect(autoId).not.toBe(fastId)
    expect(planId).not.toBe(fastId)
  })
})
