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

import { POST as copyFromGlobal } from '@/app/api/projects/[projectId]/copy-from-global/route'

describe('api contract - copy from global route (operation adapter)', () => {
  beforeEach(() => {
    authState.authenticated = true
    vi.clearAllMocks()
  })

  it('POST /api/projects/[projectId]/copy-from-global -> uses copy_asset_from_global operation', async () => {
    apiAdapterMock.executeProjectAgentOperationFromApi.mockResolvedValueOnce({ success: true })

    const res = await copyFromGlobal(
      buildMockRequest({
        path: '/api/projects/project-1/copy-from-global',
        method: 'POST',
        body: {
          type: 'location',
          targetId: 'target-1',
          globalAssetId: 'global-1',
        },
      }),
      { params: Promise.resolve({ projectId: 'project-1' }) },
    )

    expect(res.status).toBe(200)
    expect(apiAdapterMock.executeProjectAgentOperationFromApi).toHaveBeenCalledWith(expect.objectContaining({
      operationId: 'copy_asset_from_global',
      projectId: 'project-1',
      userId: 'user-1',
      input: {
        type: 'location',
        targetId: 'target-1',
        globalAssetId: 'global-1',
      },
    }))
    await expect(res.json()).resolves.toEqual({ success: true })
  })
})

