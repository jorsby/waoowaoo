import type { ProjectAgentRouteDecision } from './router'
import type { ProjectAgentInteractionMode } from './types'

export interface ProjectAgentExecutionResolution {
  interactionMode: ProjectAgentInteractionMode
  effectiveIntent: ProjectAgentRouteDecision['intent']
}

export function resolveProjectAgentExecutionMode(input: {
  interactionMode?: ProjectAgentInteractionMode
  routedIntent: ProjectAgentRouteDecision['intent']
}): ProjectAgentExecutionResolution {
  const interactionMode = input.interactionMode ?? 'auto'

  if (interactionMode === 'plan' && input.routedIntent === 'act') {
    return {
      interactionMode,
      effectiveIntent: 'plan',
    }
  }

  return {
    interactionMode,
    effectiveIntent: input.routedIntent,
  }
}
