import type { CommandEnvelope } from './types'

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function readOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return undefined
}

export function normalizeCommandEnvelope(params: {
  projectId: string
  body: unknown
}): CommandEnvelope {
  const body = readObject(params.body)
  const commandType = readTrimmedString(body.commandType)
  const source = readTrimmedString(body.source) === 'assistant-panel' ? 'assistant-panel' : 'gui'
  const episodeId = readTrimmedString(body.episodeId) || null
  const scopeRef = readTrimmedString(body.scopeRef) || null
  const input = readObject(body.input)
  const policyOverrides = readObject(body.policyOverrides)

  if (commandType === 'run_workflow_package') {
    const workflowIdRaw = readTrimmedString(body.workflowId)
    if (
      workflowIdRaw !== 'story-to-script'
      && workflowIdRaw !== 'script-to-storyboard'
    ) {
      throw new Error('workflowId is invalid')
    }
    return {
      commandType,
      source,
      projectId: params.projectId,
      episodeId,
      scopeRef,
      policyOverrides,
      workflowId: workflowIdRaw,
      input: {
        content: readTrimmedString(input.content) || undefined,
        model: readTrimmedString(input.model) || undefined,
        temperature: readOptionalNumber(input.temperature),
        reasoning: input.reasoning === false ? false : true,
        reasoningEffort:
          input.reasoningEffort === 'minimal'
          || input.reasoningEffort === 'low'
          || input.reasoningEffort === 'medium'
          || input.reasoningEffort === 'high'
            ? input.reasoningEffort
            : undefined,
      },
    }
  }

  if (commandType === 'run_skill') {
    const skillIdRaw = readTrimmedString(body.skillId)
    if (
      skillIdRaw !== 'insert_panel'
      && skillIdRaw !== 'panel_variant'
      && skillIdRaw !== 'regenerate_storyboard_text'
      && skillIdRaw !== 'modify_shot_prompt'
    ) {
      throw new Error('skillId is invalid')
    }
    return {
      commandType,
      source,
      projectId: params.projectId,
      episodeId,
      scopeRef,
      policyOverrides,
      skillId: skillIdRaw,
      input,
    }
  }

  throw new Error('commandType is invalid')
}
