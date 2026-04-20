import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockRequest } from '../../../helpers/request'

const authState = vi.hoisted(() => ({
  authenticated: true,
}))

const prismaMock = vi.hoisted(() => ({
  mutationBatch: {
    findUnique: vi.fn(),
  },
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
    requireUserAuth: async () => {
      if (!authState.authenticated) return unauthorized()
      return { session: { user: { id: 'user-1' } } }
    },
    forbidden: () => new Response(JSON.stringify({ error: { code: 'FORBIDDEN' } }), { status: 403 }),
    notFound: () => new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404 }),
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/adapters/api/execute-project-agent-operation', () => apiAdapterMock)

import { POST as revertPost } from '@/app/api/mutation-batches/[batchId]/revert/route'

describe('api contract - mutation batch revert route (operation adapter)', () => {
  beforeEach(() => {
    authState.authenticated = true
    vi.clearAllMocks()
  })

  it('POST /mutation-batches/[batchId]/revert -> calls revert_mutation_batch operation', async () => {
    prismaMock.mutationBatch.findUnique.mockResolvedValueOnce({
      id: 'batch-1',
      projectId: 'project-1',
      userId: 'user-1',
      status: 'active',
    })
    apiAdapterMock.executeProjectAgentOperationFromApi.mockResolvedValueOnce({
      ok: true,
      reverted: 3,
    })

    const res = await revertPost(
      buildMockRequest({
        path: '/api/mutation-batches/batch-1/revert',
        method: 'POST',
      }),
      { params: Promise.resolve({ batchId: 'batch-1' }) },
    )

    expect(res.status).toBe(200)
    expect(apiAdapterMock.executeProjectAgentOperationFromApi).toHaveBeenCalledWith(expect.objectContaining({
      operationId: 'revert_mutation_batch',
      projectId: 'project-1',
      userId: 'user-1',
      input: { batchId: 'batch-1' },
    }))
    await expect(res.json()).resolves.toEqual({ ok: true, reverted: 3 })
  })
})

