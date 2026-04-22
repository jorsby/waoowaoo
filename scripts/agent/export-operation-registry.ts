import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createProjectAgentOperationRegistry, createProjectAgentOperationRegistryForApi } from '@/lib/operations/registry'
import { selectProjectAgentOperationsByGroups } from '@/lib/project-agent/operation-injection'
import type { ProjectAgentOperationDefinition } from '@/lib/operations/types'

type ExportedOperation = {
  id: string
  summary: string
  intent: ProjectAgentOperationDefinition['intent']
  groupPath: string[]
  prerequisites: ProjectAgentOperationDefinition['prerequisites']
  effects: ProjectAgentOperationDefinition['effects']
  confirmation: ProjectAgentOperationDefinition['confirmation']
  channels: ProjectAgentOperationDefinition['channels']
}

type ExportSnapshot = {
  generatedAt: string
  alwaysOnOperationIds: string[]
  operations: ExportedOperation[]
}

function toExportedOperation(operation: ProjectAgentOperationDefinition): ExportedOperation {
  return {
    id: operation.id,
    summary: operation.summary,
    intent: operation.intent,
    groupPath: operation.groupPath,
    prerequisites: operation.prerequisites,
    effects: operation.effects,
    confirmation: operation.confirmation,
    channels: operation.channels,
  }
}

async function main() {
  const toolRegistry = createProjectAgentOperationRegistry()
  const apiRegistry = createProjectAgentOperationRegistryForApi()

  const alwaysOn = selectProjectAgentOperationsByGroups({
    registry: toolRegistry,
    requestedGroups: [],
    maxTools: 9999,
    allowedIntents: ['query', 'plan', 'act'],
  })

  const exported = Object.values(apiRegistry)
    .map(toExportedOperation)
    .sort((a, b) => a.id.localeCompare(b.id))

  const snapshot: ExportSnapshot = {
    generatedAt: new Date().toISOString(),
    alwaysOnOperationIds: alwaysOn.alwaysOnOperationIds,
    operations: exported,
  }

  const artifactDir = path.join(process.cwd(), 'docs', 'agent', 'artifacts')
  await mkdir(artifactDir, { recursive: true })
  const artifactPath = path.join(artifactDir, 'operation-registry.export.json')
  await writeFile(artifactPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  // eslint-disable-next-line no-console
  console.log(`[operation-registry.export] wrote ${exported.length} ops -> ${artifactPath}`)
  process.exit(0)
}

void main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[operation-registry.export] failed:', error)
  process.exit(1)
})
