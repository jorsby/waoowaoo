import type { CommandEnvelope, ExecutionPlanDraft } from './types'

export function requiresExplicitApproval(plan: ExecutionPlanDraft): boolean {
  return plan.requiresApproval || plan.steps.some((step) => step.mutationKind === 'delete')
}

export function resolvePlanApprovalRequirement(command: CommandEnvelope, plan: ExecutionPlanDraft): boolean {
  if (command.commandType === 'run_workflow_package' && command.source === 'gui') {
    return false
  }
  return requiresExplicitApproval(plan)
}
