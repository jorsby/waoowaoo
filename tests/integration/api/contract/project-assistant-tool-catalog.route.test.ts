import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { buildMockRequest } from '../../../helpers/request'
import type { ProjectAgentOperationRegistry } from '@/lib/operations/types'

const authState = vi.hoisted(() => ({
  authenticated: true,
}))

const registryState = vi.hoisted(() => ({
  registry: {} as ProjectAgentOperationRegistry,
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

vi.mock('@/lib/operations/registry', () => ({
  createProjectAgentOperationRegistry: () => registryState.registry,
}))

import { GET as toolCatalogGet } from '@/app/api/projects/[projectId]/assistant/tool-catalog/route'

describe('project assistant tool-catalog route', () => {
  beforeEach(() => {
    authState.authenticated = true
    registryState.registry = {
      visible: {
        id: 'visible',
        description: 'visible tool',
        scope: 'project',
        sideEffects: { mode: 'query', risk: 'low' },
        channels: { tool: true, api: true },
        tool: { selectable: true, defaultVisibility: 'core', groups: ['read'], tags: ['read'] },
        inputSchema: z.object({}),
        outputSchema: z.unknown(),
        execute: async () => ({}),
      },
      hidden: {
        id: 'hidden',
        description: 'hidden tool',
        scope: 'project',
        sideEffects: { mode: 'query', risk: 'low' },
        channels: { tool: true, api: true },
        tool: { selectable: false, defaultVisibility: 'hidden', groups: ['x'], tags: ['x'] },
        inputSchema: z.object({}),
        outputSchema: z.unknown(),
        execute: async () => ({}),
      },
    }
    vi.clearAllMocks()
  })

  it('GET /api/projects/[projectId]/assistant/tool-catalog -> returns selectable tools', async () => {
    const response = await toolCatalogGet(
      buildMockRequest({
        path: '/api/projects/project-1/assistant/tool-catalog',
        method: 'GET',
        query: { locale: 'zh' },
      }),
      { params: Promise.resolve({ projectId: 'project-1' }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      tools: [
        expect.objectContaining({
          operationId: 'visible',
          description: 'visible tool',
        }),
      ],
    })
  })

  it('GET /api/projects/[projectId]/assistant/tool-catalog -> passes locale through to catalog builder', async () => {
    registryState.registry = {
      asset_hub_list_folders: {
        id: 'asset_hub_list_folders',
        description: 'List global asset folders for the current user.',
        scope: 'project',
        sideEffects: { mode: 'query', risk: 'low' },
        channels: { tool: true, api: true },
        tool: { selectable: true, defaultVisibility: 'core', groups: ['asset-hub'], tags: ['read'] },
        inputSchema: z.object({}),
        outputSchema: z.unknown(),
        execute: async () => ({}),
      },
    }

    const response = await toolCatalogGet(
      buildMockRequest({
        path: '/api/projects/project-1/assistant/tool-catalog',
        method: 'GET',
        query: { locale: 'zh' },
      }),
      { params: Promise.resolve({ projectId: 'project-1' }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      tools: [
        expect.objectContaining({
          operationId: 'asset_hub_list_folders',
          description: '列出当前用户的全局资产文件夹。',
        }),
      ],
    })
  })

  it('GET /api/projects/[projectId]/assistant/tool-catalog -> rejects unauthenticated requests', async () => {
    authState.authenticated = false
    const response = await toolCatalogGet(
      buildMockRequest({
        path: '/api/projects/project-1/assistant/tool-catalog',
        method: 'GET',
      }),
      { params: Promise.resolve({ projectId: 'project-1' }) },
    )

    expect(response.status).toBe(401)
  })
})
