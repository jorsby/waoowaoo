import type {
  OperationChannels,
  OperationConfirmation,
  OperationGroupPath,
  OperationPrerequisites,
  ProjectAgentOperationRegistry,
  ProjectAgentOperationRegistryDraft,
} from './types'

export interface OperationPackDefaults {
  groupPath: OperationGroupPath
  channels: OperationChannels
  prerequisites: OperationPrerequisites
  confirmation: OperationConfirmation
}

function normalizeGroupPath(groupPath: OperationGroupPath): OperationGroupPath {
  const normalized = groupPath
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
  if (normalized.length === 0) {
    throw new Error('PROJECT_AGENT_OPERATION_GROUP_PATH_EMPTY')
  }
  return normalized
}

function normalizeOperationSummary(operation: { id: string; summary: string }): string {
  const trimmed = operation.summary.trim()
  if (!trimmed) {
    throw new Error(`PROJECT_AGENT_OPERATION_SUMMARY_MISSING:${String(operation.id)}`)
  }
  return trimmed
}

function normalizeChannels(channels: OperationChannels): OperationChannels {
  return {
    tool: channels.tool === true,
    api: channels.api === true,
  }
}

function mergePrerequisites(
  operation: { id: string; prerequisites?: Partial<OperationPrerequisites> },
  defaults: OperationPackDefaults,
): OperationPrerequisites {
  const episodeId = operation.prerequisites?.episodeId ?? defaults.prerequisites.episodeId
  if (episodeId !== 'required' && episodeId !== 'optional' && episodeId !== 'forbidden') {
    throw new Error(`PROJECT_AGENT_OPERATION_PREREQUISITE_EPISODE_INVALID:${String(operation.id)}`)
  }
  return { episodeId }
}

function mergeConfirmation(
  operation: { confirmation?: OperationConfirmation },
  defaults: OperationPackDefaults,
): OperationConfirmation {
  const base = operation.confirmation ?? defaults.confirmation
  return {
    required: base.required === true,
    summary: base.summary ?? null,
    budget: base.budget ?? null,
  }
}

function assertOperationFolderGroupConsistency(params: {
  operationId: string
  groupPath: OperationGroupPath
  defaultsGroupPath: OperationGroupPath
}): void {
  const defaultsFolderGroup = params.defaultsGroupPath[0]
  const operationFolderGroup = params.groupPath[0]
  if (operationFolderGroup !== defaultsFolderGroup) {
    throw new Error(
      `PROJECT_AGENT_OPERATION_GROUP_PATH_FOLDER_MISMATCH:${params.operationId}:${operationFolderGroup}:${defaultsFolderGroup}`,
    )
  }
}

export function withOperationPack(
  registry: ProjectAgentOperationRegistryDraft,
  defaults: OperationPackDefaults,
): ProjectAgentOperationRegistry {
  const normalizedDefaults: OperationPackDefaults = {
    groupPath: normalizeGroupPath(defaults.groupPath),
    channels: normalizeChannels(defaults.channels),
    prerequisites: defaults.prerequisites,
    confirmation: defaults.confirmation,
  }

  const out: ProjectAgentOperationRegistry = {}
  for (const [operationId, operation] of Object.entries(registry)) {
    const groupPath = normalizeGroupPath(operation.groupPath ?? normalizedDefaults.groupPath)
    assertOperationFolderGroupConsistency({
      operationId,
      groupPath,
      defaultsGroupPath: normalizedDefaults.groupPath,
    })
    out[operationId] = {
      ...operation,
      summary: normalizeOperationSummary(operation),
      groupPath,
      channels: normalizeChannels(operation.channels ?? normalizedDefaults.channels),
      prerequisites: mergePrerequisites(operation, normalizedDefaults),
      confirmation: mergeConfirmation(operation, normalizedDefaults),
    }
  }
  return out
}
