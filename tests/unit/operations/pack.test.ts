import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { withOperationPack } from '@/lib/operations/pack'
import type { OperationPackDefaults } from '@/lib/operations/pack'
import type {
  OperationEffects,
  ProjectAgentOperationDefinitionBase,
  ProjectAgentOperationRegistryDraft,
} from '@/lib/operations/types'

const NOOP_EFFECTS: OperationEffects = {
  writes: false,
  billable: false,
  destructive: false,
  overwrite: false,
  bulk: false,
  externalSideEffects: false,
  longRunning: false,
}

function createNoopOperation(params: {
  id: string
  groupPath?: string[]
}): ProjectAgentOperationDefinitionBase<unknown, unknown> {
  return {
    id: params.id,
    summary: params.id,
    intent: 'act',
    groupPath: params.groupPath,
    effects: NOOP_EFFECTS,
    confirmation: { required: false },
    inputSchema: z.unknown(),
    outputSchema: z.unknown(),
    execute: async () => null,
  }
}

describe('withOperationPack', () => {
  it('throws when operation groupPath folder differs from pack defaults', () => {
    const draft: ProjectAgentOperationRegistryDraft = {
      ok: createNoopOperation({ id: 'ok', groupPath: ['asset', 'edit'] }),
      bad: createNoopOperation({ id: 'bad', groupPath: ['storyboard', 'edit'] }),
    }

    const defaults: OperationPackDefaults = {
      groupPath: ['asset', 'edit'],
      channels: { tool: true, api: false },
      prerequisites: { episodeId: 'optional' },
      confirmation: { required: false },
    }

    expect(() => withOperationPack(draft, defaults)).toThrow(
      'PROJECT_AGENT_OPERATION_GROUP_PATH_FOLDER_MISMATCH:bad:storyboard:asset',
    )
  })

  it('uses default groupPath when operation groupPath is omitted', () => {
    const draft: ProjectAgentOperationRegistryDraft = {
      ok: createNoopOperation({ id: 'ok' }),
    }

    const defaults: OperationPackDefaults = {
      groupPath: ['project', 'read'],
      channels: { tool: true, api: false },
      prerequisites: { episodeId: 'optional' },
      confirmation: { required: false },
    }

    const registry = withOperationPack(draft, defaults)
    expect(registry.ok.groupPath).toEqual(['project', 'read'])
  })

  it('allows groupPath overrides within the same folder group', () => {
    const draft: ProjectAgentOperationRegistryDraft = {
      ok: createNoopOperation({ id: 'ok', groupPath: ['asset', 'character'] }),
    }

    const defaults: OperationPackDefaults = {
      groupPath: ['asset', 'edit'],
      channels: { tool: true, api: false },
      prerequisites: { episodeId: 'optional' },
      confirmation: { required: false },
    }

    const registry = withOperationPack(draft, defaults)
    expect(registry.ok.groupPath).toEqual(['asset', 'character'])
  })
})
