import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { buildMockRequest } from '../../../helpers/request'
import type { ProjectAgentToolSelection } from '@/lib/project-agent/tool-selection'

type ToolSelectionSnapshot = {
  scope: 'global' | 'project' | 'episode'
  scopeRef: string
  selection: ProjectAgentToolSelection
  updatedAt: string
}

const authState = vi.hoisted(() => ({
  authenticated: true,
}))

const storeMock = vi.hoisted(() => ({
  loadProjectAssistantToolSelection: vi.fn<() => Promise<ToolSelectionSnapshot | null>>(async () => null),
  saveProjectAssistantToolSelection: vi.fn(async () => ({
    scope: 'global',
    scopeRef: 'global',
    selection: {
      profile: { mode: 'edit', packs: [], riskBudget: 'allow-medium', optionalTags: [] },
      overrides: { enabledOperationIds: [], disabledOperationIds: [], pinnedOperationIds: [] },
    },
    updatedAt: '2026-04-20T00:00:00.000Z',
  })),
  clearProjectAssistantToolSelection: vi.fn(async () => undefined),
  PROJECT_ASSISTANT_TOOL_SELECTION_SCOPE: {
    GLOBAL: 'global',
    PROJECT: 'project',
    EPISODE: 'episode',
  },
}))

vi.mock('@/lib/api-auth', () => {
  const unauthorized = () => new Response(
    JSON.stringify({ error: { code: 'UNAUTHORIZED' } }),
    { status: 401, headers: { 'content-type': 'application/json' } },
  )

  return {
    isErrorResponse: (value: unknown) => value instanceof Response,
    requireProjectAuth: async (projectId: string) => {
      if (!authState.authenticated) return unauthorized()
      return {
        session: { user: { id: 'user-1' } },
        project: { id: projectId, userId: 'user-1' },
      }
    },
  }
})

vi.mock('@/lib/project-agent/tool-selection-store', () => storeMock)

import { GET as getRoute, PUT as putRoute, DELETE as deleteRoute } from '@/app/api/projects/[projectId]/assistant/tool-selection/route'

describe('project assistant tool-selection route', () => {
  beforeEach(() => {
    authState.authenticated = true
    vi.clearAllMocks()
  })

  it('GET -> returns current selection snapshot payload', async () => {
    storeMock.loadProjectAssistantToolSelection.mockResolvedValueOnce({
      scope: 'global',
      scopeRef: 'global',
      selection: {
        profile: { mode: 'edit', packs: [], riskBudget: 'allow-medium', optionalTags: [] },
        overrides: { enabledOperationIds: [], disabledOperationIds: [], pinnedOperationIds: [] },
      },
      updatedAt: '2026-04-20T00:00:00.000Z',
    })

    const response = await getRoute(
      buildMockRequest({
        path: '/api/projects/project-1/assistant/tool-selection',
        method: 'GET',
        query: {
          scope: 'global',
        },
      }),
      { params: Promise.resolve({ projectId: 'project-1' }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      selection: expect.any(Object),
      scope: 'global',
      scopeRef: 'global',
    })
    expect(storeMock.loadProjectAssistantToolSelection).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      assistantId: 'workspace-command',
      scope: 'global',
      projectId: 'project-1',
    }))
  })

  it('PUT -> saves selection snapshot', async () => {
    const response = await putRoute(
      buildMockRequest({
        path: '/api/projects/project-1/assistant/tool-selection',
        method: 'PUT',
        body: {
          scope: 'global',
          selection: {
            profile: { mode: 'edit', riskBudget: 'allow-medium' },
            overrides: {},
          },
        },
      }),
      { params: Promise.resolve({ projectId: 'project-1' }) },
    )

    expect(response.status).toBe(200)
    expect(storeMock.saveProjectAssistantToolSelection).toHaveBeenCalledTimes(1)
  })

  it('DELETE -> clears selection snapshot', async () => {
    const response = await deleteRoute(
      buildMockRequest({
        path: '/api/projects/project-1/assistant/tool-selection',
        method: 'DELETE',
        query: {
          scope: 'global',
        },
      }),
      { params: Promise.resolve({ projectId: 'project-1' }) },
    )

    expect(response.status).toBe(200)
    expect(storeMock.clearProjectAssistantToolSelection).toHaveBeenCalledTimes(1)
  })

  it('PUT -> validates JSON body', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/projects/project-1/assistant/tool-selection'), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: '{',
    })

    const response = await putRoute(
      request,
      { params: Promise.resolve({ projectId: 'project-1' }) },
    )

    expect(response.status).toBe(400)
  })

  it('GET -> rejects unauthenticated requests', async () => {
    authState.authenticated = false
    const response = await getRoute(
      buildMockRequest({
        path: '/api/projects/project-1/assistant/tool-selection',
        method: 'GET',
      }),
      { params: Promise.resolve({ projectId: 'project-1' }) },
    )

    expect(response.status).toBe(401)
  })
})
