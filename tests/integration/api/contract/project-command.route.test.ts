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
    requireProjectAuth: async (projectId: string) => {
      if (!authState.authenticated) return unauthorized()
      return {
        session: { user: { id: 'user-1' } },
        project: { id: projectId, userId: 'user-1' },
      }
    },
  }
})

vi.mock('@/lib/adapters/api/execute-project-agent-operation', () => apiAdapterMock)

import { GET as getCommand } from '@/app/api/projects/[projectId]/commands/[commandId]/route'

describe('project command route', () => {
  beforeEach(() => {
    authState.authenticated = true
    vi.clearAllMocks()
  })

  it('GET /api/projects/[projectId]/commands/[commandId] -> uses get_project_command operation', async () => {
    apiAdapterMock.executeProjectAgentOperationFromApi.mockResolvedValueOnce({
      command: { commandId: 'command-1' },
    })

    const res = await getCommand(
      buildMockRequest({
        path: '/api/projects/project-1/commands/command-1',
        method: 'GET',
      }),
      { params: Promise.resolve({ projectId: 'project-1', commandId: 'command-1' }) },
    )

    expect(res.status).toBe(200)
    expect(apiAdapterMock.executeProjectAgentOperationFromApi).toHaveBeenCalledWith(expect.objectContaining({
      operationId: 'get_project_command',
      projectId: 'project-1',
      userId: 'user-1',
      input: { commandId: 'command-1' },
    }))
    await expect(res.json()).resolves.toEqual({ command: { commandId: 'command-1' } })
  })
})

