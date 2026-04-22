import { describe, expect, it } from 'vitest'
import { asSchema } from '@ai-sdk/provider-utils'
import { createProjectAgentOperationRegistry } from '@/lib/operations/registry'

function collectBooleanEnums(value: unknown, out: unknown[][]) {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) collectBooleanEnums(item, out)
    return
  }
  const record = value as Record<string, unknown>
  if (Array.isArray(record.enum) && record.enum.some((item) => typeof item === 'boolean')) {
    out.push(record.enum)
  }
  for (const child of Object.values(record)) {
    collectBooleanEnums(child, out)
  }
}

describe('tool input schema compatibility', () => {
  it('does not emit boolean enum values in tool parameter schemas', () => {
    const registry = createProjectAgentOperationRegistry()
    const violations: Array<{ id: string; enum: unknown[] }> = []
    for (const operation of Object.values(registry)) {
      if (!operation.channels.tool) continue
      const json = asSchema(operation.inputSchema).jsonSchema
      const enums: unknown[][] = []
      collectBooleanEnums(json, enums)
      for (const e of enums) {
        violations.push({ id: operation.id, enum: e })
      }
    }
    expect(violations).toEqual([])
  })
})

