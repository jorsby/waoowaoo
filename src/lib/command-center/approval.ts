import type { ExecutionPlanDraft } from './types'

export function requiresExplicitApproval(plan: ExecutionPlanDraft): boolean {
  return plan.requiresApproval || plan.steps.some((step) => step.mutationKind === 'delete')
}
