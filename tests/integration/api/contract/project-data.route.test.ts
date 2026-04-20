import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockRequest } from '../../../helpers/request'

const authState = vi.hoisted(() => ({
  authenticated: true,
}))

const apiAdapterMock = vi.hoisted(() => ({
  executeProjectAgentOperationFromApi: vi.fn(),
}))

vi.mock('@/lib/api-auth', () => {
  const unauthorized = () => new Response(
    JSON.stringify({ error: { code: 'UNAUTHORIZED' } }),
    { status: 401, headers: { 'content-type': 'application/json' } },
  )

  return {
    isErrorResponse: (value: unknown) => value instanceof Response,
    requireProjectAuthLight: async (projectId: string) => {
      if (!authState.authenticated) return unauthorized()
      return {
        session: { user: { id: 'user-1' } },
        project: { id: projectId, userId: 'user-1', name: 'Project' },
      }
    },
  }
})

vi.mock('@/lib/adapters/api/execute-project-agent-operation', () => apiAdapterMock)

import { GET as getData } from '@/app/api/projects/[projectId]/data/route'

describe('api contract - project data route (operation adapter)', () => {
  beforeEach(() => {
    authState.authenticated = true
    vi.clearAllMocks()
  })

  it('GET /api/projects/[projectId]/data -> uses get_project_data operation', async () => {
    apiAdapterMock.executeProjectAgentOperationFromApi.mockResolvedValueOnce({ project: { id: 'project-1' } })

    const res = await getData(
      buildMockRequest({
        path: '/api/projects/project-1/data',
        method: 'GET',
      }),
      { params: Promise.resolve({ projectId: 'project-1' }) },
    )

    expect(res.status).toBe(200)
    expect(apiAdapterMock.executeProjectAgentOperationFromApi).toHaveBeenCalledWith(expect.objectContaining({
      operationId: 'get_project_data',
      projectId: 'project-1',
      userId: 'user-1',
      input: {},
    }))
    await expect(res.json()).resolves.toEqual({ project: { id: 'project-1' } })
  })
})

