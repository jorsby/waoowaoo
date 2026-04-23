import type { AiOptionSchema } from '@/lib/ai-registry/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function validateAiOptions(input: {
  schema: AiOptionSchema
  options: unknown
  context: string
}): void {
  if (input.options === undefined || input.options === null) return
  if (!isRecord(input.options)) {
    throw new Error(`AI_OPTIONS_INVALID:${input.context}`)
  }
  for (const [key, value] of Object.entries(input.options)) {
    if (!input.schema.allowedKeys.has(key)) {
      throw new Error(`AI_OPTION_UNSUPPORTED:${input.context}:${key}`)
    }
    const validator = input.schema.validators[key]
    if (!validator) continue
    const result = validator(value)
    if (!result.ok) {
      throw new Error(`AI_OPTION_INVALID:${input.context}:${key}:${result.reason}`)
    }
  }
}
