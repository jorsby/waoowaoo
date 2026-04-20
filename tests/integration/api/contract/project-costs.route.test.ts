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

import { GET as getCosts } from '@/app/api/projects/[projectId]/costs/route'

describe('api contract - project costs route (operation adapter)', () => {
  beforeEach(() => {
    authState.authenticated = true
    vi.clearAllMocks()
  })

  it('GET /api/projects/[projectId]/costs -> uses get_project_costs operation', async () => {
    apiAdapterMock.executeProjectAgentOperationFromApi.mockResolvedValueOnce({ currency: 'USD' })

    const res = await getCosts(
      buildMockRequest({
        path: '/api/projects/project-1/costs',
        method: 'GET',
      }),
      { params: Promise.resolve({ projectId: 'project-1' }) },
    )

    expect(res.status).toBe(200)
    expect(apiAdapterMock.executeProjectAgentOperationFromApi).toHaveBeenCalledWith(expect.objectContaining({
      operationId: 'get_project_costs',
      projectId: 'project-1',
      userId: 'user-1',
      input: {},
    }))
    await expect(res.json()).resolves.toEqual({ currency: 'USD' })
  })
})
