import { describe, expect, it } from 'vitest'
import { resolveProjectAgentExecutionMode } from '@/lib/project-agent/execution-mode'

describe('project agent execution mode', () => {
  it('defaults to auto when interactionMode is absent', () => {
    expect(resolveProjectAgentExecutionMode({
      routedIntent: 'query',
    })).toEqual({
      interactionMode: 'auto',
      effectiveIntent: 'query',
    })
  })

  it('downgrades act intent to plan in explicit plan mode', () => {
    expect(resolveProjectAgentExecutionMode({
      interactionMode: 'plan',
      routedIntent: 'act',
    })).toEqual({
      interactionMode: 'plan',
      effectiveIntent: 'plan',
    })
  })

  it('keeps act intent in fast mode', () => {
    expect(resolveProjectAgentExecutionMode({
      interactionMode: 'fast',
      routedIntent: 'act',
    })).toEqual({
      interactionMode: 'fast',
      effectiveIntent: 'act',
    })
  })
})
