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

import { PUT as putPhotographyPlan } from '@/app/api/projects/[projectId]/photography-plan/route'

describe('api contract - photography plan route (operation adapter)', () => {
  beforeEach(() => {
    authState.authenticated = true
    vi.clearAllMocks()
  })

  it('PUT /api/projects/[projectId]/photography-plan -> uses update_storyboard_photography_plan operation', async () => {
    apiAdapterMock.executeProjectAgentOperationFromApi.mockResolvedValueOnce({ success: true })

    const res = await putPhotographyPlan(
      buildMockRequest({
        path: '/api/projects/project-1/photography-plan',
        method: 'PUT',
        body: {
          storyboardId: 'storyboard-1',
          photographyPlan: { angle: 'close' },
        },
      }),
      { params: Promise.resolve({ projectId: 'project-1' }) },
    )

    expect(res.status).toBe(200)
    expect(apiAdapterMock.executeProjectAgentOperationFromApi).toHaveBeenCalledWith(expect.objectContaining({
      operationId: 'update_storyboard_photography_plan',
      projectId: 'project-1',
      userId: 'user-1',
      input: {
        storyboardId: 'storyboard-1',
        photographyPlan: { angle: 'close' },
      },
    }))
    await expect(res.json()).resolves.toEqual({ success: true })
  })
})

