import type {
  OperationSideEffects,
  OperationToolVisibility,
  OperationScope,
  ProjectAgentOperationDefinition,
  ProjectAgentOperationRegistry,
} from '@/lib/operations/types'
import { localizeSelectableToolDescription } from './copy'
import { normalizeProjectAgentLocale } from './locale'

export interface ProjectAgentToolCatalogItem {
  operationId: string
  description: string
  groups: string[]
  tags: string[]
  defaultVisibility: OperationToolVisibility
  scope: OperationScope
  sideEffects: OperationSideEffects | null
}

export interface ProjectAgentToolCatalog {
  tools: ProjectAgentToolCatalogItem[]
}

function normalizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  const out: string[] = []
  for (const value of values) {
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (!trimmed) continue
    out.push(trimmed)
  }
  return out
}

function readVisibility(operation: ProjectAgentOperationDefinition): OperationToolVisibility {
  const v = operation.tool?.defaultVisibility
  if (v === 'hidden' || v === 'core' || v === 'scenario' || v === 'extended' || v === 'guarded') return v
  return 'extended'
}

function isSelectable(operation: ProjectAgentOperationDefinition): boolean {
  if (!operation.tool) return false
  return operation.tool.selectable === true
}

export function buildProjectAgentToolCatalog(
  operations: ProjectAgentOperationRegistry,
  locale?: string,
): ProjectAgentToolCatalog {
  const normalizedLocale = normalizeProjectAgentLocale(locale)
  const tools: ProjectAgentToolCatalogItem[] = []

  for (const [operationId, operation] of Object.entries(operations)) {
    const channels = operation.channels ?? { tool: true, api: true }
    if (!channels.tool) continue
    if (!isSelectable(operation)) continue

    tools.push({
      operationId,
      description: localizeSelectableToolDescription(operationId, operation.description, normalizedLocale),
      groups: normalizeStringList(operation.tool?.groups),
      tags: normalizeStringList(operation.tool?.tags),
      defaultVisibility: readVisibility(operation),
      scope: operation.scope,
      sideEffects: operation.sideEffects ?? null,
    })
  }

  tools.sort((a, b) => {
    const groupA = a.groups.join('/').toLowerCase()
    const groupB = b.groups.join('/').toLowerCase()
    if (groupA !== groupB) return groupA.localeCompare(groupB)
    return a.operationId.localeCompare(b.operationId)
  })

  return { tools }
}
