import { createDefaultPolicy } from './defaults'
import type { PolicyOverrideInput, PolicySnapshot } from './types'

export function resolvePolicy(params: {
  projectId: string
  episodeId?: string | null
  projectPolicy?: Partial<PolicySnapshot> | null
  commandPolicy?: PolicyOverrideInput | null
}): PolicySnapshot {
  const base = createDefaultPolicy(params.projectId, params.episodeId || null)
  const projectPolicy = params.projectPolicy || null
  const commandPolicy = params.commandPolicy || null

  return {
    ...base,
    ...(projectPolicy || {}),
    ...(commandPolicy || {}),
    projectId: params.projectId,
    episodeId: params.episodeId || null,
    overrides: {
      ...(projectPolicy?.overrides || {}),
      ...(commandPolicy?.overrides || {}),
    },
  }
}
