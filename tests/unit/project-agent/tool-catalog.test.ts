import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { ProjectAgentOperationRegistry } from '@/lib/operations/types'
import { buildProjectAgentToolCatalog } from '@/lib/project-agent/tool-catalog'

describe('buildProjectAgentToolCatalog', () => {
  it('returns selectable tool operations only and stable sorting', () => {
    const operations: ProjectAgentOperationRegistry = {
      a_hidden: {
        id: 'a_hidden',
        description: 'hidden',
        scope: 'project',
        sideEffects: { mode: 'query', risk: 'low' },
        channels: { tool: true, api: true },
        tool: { selectable: false, defaultVisibility: 'hidden', groups: ['x'], tags: ['x'] },
        inputSchema: z.object({}),
        outputSchema: z.unknown(),
        execute: async () => ({}),
      },
      b_visible: {
        id: 'b_visible',
        description: 'visible',
        scope: 'project',
        sideEffects: { mode: 'query', risk: 'low' },
        channels: { tool: true, api: true },
        tool: { selectable: true, defaultVisibility: 'core', groups: ['group'], tags: ['read'] },
        inputSchema: z.object({}),
        outputSchema: z.unknown(),
        execute: async () => ({}),
      },
      c_visible: {
        id: 'c_visible',
        description: 'visible2',
        scope: 'project',
        sideEffects: { mode: 'query', risk: 'low' },
        channels: { tool: true, api: true },
        tool: { selectable: true, defaultVisibility: 'extended', groups: ['group'], tags: ['read'] },
        inputSchema: z.object({}),
        outputSchema: z.unknown(),
        execute: async () => ({}),
      },
    }

    const catalog = buildProjectAgentToolCatalog(operations)
    expect(catalog.tools.map((t) => t.operationId)).toEqual(['b_visible', 'c_visible'])
    expect(catalog.tools[0]?.groups).toEqual(['group'])
  })

  it('localizes selectable descriptions for supported locale copy', () => {
    const operations: ProjectAgentOperationRegistry = {
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

    const catalog = buildProjectAgentToolCatalog(operations, 'zh')
    expect(catalog.tools[0]?.description).toBe('列出当前用户的全局资产文件夹。')
  })
})
