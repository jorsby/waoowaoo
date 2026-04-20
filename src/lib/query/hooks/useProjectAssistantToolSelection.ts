'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-fetch'
import type { ProjectAgentToolSelection } from '@/lib/project-agent/tool-selection'
import { queryKeys } from '../keys'

interface ToolSelectionResponse {
  selection: ProjectAgentToolSelection | null
  scope: string
  scopeRef: string | null
}

export function useProjectAssistantToolSelection(params: {
  projectId: string | null
  scope: 'global' | 'project' | 'episode'
  episodeId?: string | null
}) {
  return useQuery({
    queryKey: queryKeys.project.assistantToolSelection(params.projectId || '', params.scope, params.episodeId || ''),
    queryFn: async () => {
      if (!params.projectId) throw new Error('projectId is required')
      const search = new URLSearchParams()
      search.set('scope', params.scope)
      if (params.episodeId) search.set('episodeId', params.episodeId)
      const response = await apiFetch(`/api/projects/${params.projectId}/assistant/tool-selection?${search.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to load assistant tool selection')
      }
      const data = await response.json() as ToolSelectionResponse
      return data.selection
    },
    enabled: !!params.projectId,
    staleTime: 5000,
  })
}

export function useProjectAssistantToolSelectionSync(params: {
  projectId: string | null
  scope: 'global' | 'project' | 'episode'
  episodeId?: string | null
}) {
  const queryClient = useQueryClient()

  const save = useCallback(async (selection: ProjectAgentToolSelection): Promise<ProjectAgentToolSelection> => {
    if (!params.projectId) throw new Error('projectId is required')
    const response = await apiFetch(`/api/projects/${params.projectId}/assistant/tool-selection`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        scope: params.scope,
        episodeId: params.episodeId || undefined,
        selection,
      }),
    })
    if (!response.ok) {
      throw new Error('Failed to save assistant tool selection')
    }
    const data = await response.json() as ToolSelectionResponse
    queryClient.setQueryData(
      queryKeys.project.assistantToolSelection(params.projectId, params.scope, params.episodeId || ''),
      data.selection,
    )
    return data.selection as ProjectAgentToolSelection
  }, [params.episodeId, params.projectId, params.scope, queryClient])

  const clear = useCallback(async (): Promise<void> => {
    if (!params.projectId) throw new Error('projectId is required')
    const search = new URLSearchParams()
    search.set('scope', params.scope)
    if (params.episodeId) search.set('episodeId', params.episodeId)
    const response = await apiFetch(`/api/projects/${params.projectId}/assistant/tool-selection?${search.toString()}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Failed to clear assistant tool selection')
    }
    queryClient.setQueryData(
      queryKeys.project.assistantToolSelection(params.projectId, params.scope, params.episodeId || ''),
      null,
    )
  }, [params.episodeId, params.projectId, params.scope, queryClient])

  return {
    save,
    clear,
  }
}

