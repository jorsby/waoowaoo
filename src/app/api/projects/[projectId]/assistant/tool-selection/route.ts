import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse, requireProjectAuth } from '@/lib/api-auth'
import type { ProjectAssistantId } from '@/lib/project-agent/types'
import {
  PROJECT_ASSISTANT_TOOL_SELECTION_SCOPE,
  clearProjectAssistantToolSelection,
  loadProjectAssistantToolSelection,
  saveProjectAssistantToolSelection,
} from '@/lib/project-agent/tool-selection-store'
import { normalizeProjectAgentToolSelection } from '@/lib/project-agent/tool-selection'

const DEFAULT_ASSISTANT_ID: ProjectAssistantId = 'workspace-command'

type RequestBody = {
  scope?: unknown
  episodeId?: unknown
  selection?: unknown
}

function readScope(value: unknown) {
  if (value === undefined || value === null || value === '') return PROJECT_ASSISTANT_TOOL_SELECTION_SCOPE.GLOBAL
  if (value === PROJECT_ASSISTANT_TOOL_SELECTION_SCOPE.GLOBAL) return PROJECT_ASSISTANT_TOOL_SELECTION_SCOPE.GLOBAL
  if (value === PROJECT_ASSISTANT_TOOL_SELECTION_SCOPE.PROJECT) return PROJECT_ASSISTANT_TOOL_SELECTION_SCOPE.PROJECT
  if (value === PROJECT_ASSISTANT_TOOL_SELECTION_SCOPE.EPISODE) return PROJECT_ASSISTANT_TOOL_SELECTION_SCOPE.EPISODE
  throw new ApiError('INVALID_PARAMS', {
    code: 'PROJECT_AGENT_TOOL_SELECTION_INVALID_SCOPE',
    message: 'scope must be global|project|episode',
  })
}

function readEpisodeId(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError('INVALID_PARAMS', {
      code: 'PROJECT_AGENT_TOOL_SELECTION_INVALID_EPISODE',
      message: 'episodeId must be a string',
    })
  }
  return value.trim()
}

export const runtime = 'nodejs'

export const GET = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  const scope = readScope(request.nextUrl.searchParams.get('scope'))
  const episodeId = readEpisodeId(request.nextUrl.searchParams.get('episodeId'))

  const snapshot = await loadProjectAssistantToolSelection({
    userId: authResult.session.user.id,
    assistantId: DEFAULT_ASSISTANT_ID,
    scope,
    projectId,
    episodeId,
  })

  return NextResponse.json({ selection: snapshot?.selection ?? null, scope: scope, scopeRef: snapshot?.scopeRef ?? null })
})

export const PUT = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    throw new ApiError('INVALID_PARAMS', {
      code: 'BODY_PARSE_FAILED',
      field: 'body',
      message: 'request body must be valid JSON',
    })
  }

  const scope = readScope(body.scope)
  const episodeId = readEpisodeId(body.episodeId)
  const selection = normalizeProjectAgentToolSelection(body.selection)
  if (!selection) {
    throw new ApiError('INVALID_PARAMS', {
      code: 'PROJECT_AGENT_TOOL_SELECTION_INVALID',
      message: 'selection is required',
    })
  }

  const saved = await saveProjectAssistantToolSelection({
    userId: authResult.session.user.id,
    assistantId: DEFAULT_ASSISTANT_ID,
    scope,
    projectId,
    episodeId,
    selection,
  })

  return NextResponse.json({ selection: saved.selection, scope: saved.scope, scopeRef: saved.scopeRef, updatedAt: saved.updatedAt })
})

export const DELETE = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  const scope = readScope(request.nextUrl.searchParams.get('scope'))
  const episodeId = readEpisodeId(request.nextUrl.searchParams.get('episodeId'))

  await clearProjectAssistantToolSelection({
    userId: authResult.session.user.id,
    assistantId: DEFAULT_ASSISTANT_ID,
    scope,
    projectId,
    episodeId,
  })

  return NextResponse.json({ success: true })
})

