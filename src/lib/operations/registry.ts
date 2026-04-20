import { createProjectAgentOperationRegistry as createRawProjectAgentOperationRegistry } from './project-agent'
import { createApiOnlyOperationRegistry } from './api-only'
export type {
  ProjectAgentOperationContext,
  ProjectAgentOperationDefinition,
  ProjectAgentOperationRegistry,
} from './types'

function validateOperationRegistry(registry: Record<string, { id: string }>) {
  for (const [operationId, operation] of Object.entries(registry)) {
    if (operation.id !== operationId) {
      throw new Error(`PROJECT_AGENT_OPERATION_ID_MISMATCH:${operationId}:${operation.id}`)
    }
  }
}

export function createProjectAgentOperationRegistry() {
  const registry = createRawProjectAgentOperationRegistry()
  validateOperationRegistry(registry)
  return registry
}

export function createProjectAgentOperationRegistryForApi() {
  const base = createRawProjectAgentOperationRegistry()
  const apiOnly = createApiOnlyOperationRegistry()

  for (const id of Object.keys(apiOnly)) {
    if (Object.prototype.hasOwnProperty.call(base, id)) {
      throw new Error(`PROJECT_AGENT_API_OPERATION_ID_CONFLICT:${id}`)
    }
  }

  const merged = {
    ...base,
    ...apiOnly,
  }
  validateOperationRegistry(merged)
  return merged
}
