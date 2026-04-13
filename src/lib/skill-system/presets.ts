import type { WorkflowPackageId, WorkflowPresetDefinition } from './types'
import { getWorkflowPackage, listWorkflowPackages } from './catalog'

export function getWorkflowPresetDefinition(workflowId: WorkflowPackageId): WorkflowPresetDefinition {
  const workflowPackage = getWorkflowPackage(workflowId)
  return {
    id: workflowPackage.manifest.id,
    name: workflowPackage.manifest.name,
    summary: workflowPackage.manifest.summary,
    workflowType: workflowPackage.manifest.workflowType,
    taskType: workflowPackage.manifest.taskType,
    skillIds: workflowPackage.steps.map((step) => step.skillId),
    requiresApproval: workflowPackage.manifest.requiresApproval,
  }
}

export function listWorkflowPresetDefinitions(): WorkflowPresetDefinition[] {
  return listWorkflowPackages().map((workflowPackage) => getWorkflowPresetDefinition(workflowPackage.manifest.id))
}
