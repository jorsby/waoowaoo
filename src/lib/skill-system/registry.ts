import type { SkillDefinition, WorkflowSkillId } from './types'
import { getSkillPackage, listSkillPackages } from './catalog'

export function getSkillDefinition(skillId: WorkflowSkillId): SkillDefinition {
  const skillPackage = getSkillPackage(skillId)
  return {
    id: skillPackage.metadata.id,
    name: skillPackage.metadata.name,
    summary: skillPackage.metadata.summary,
    riskLevel: skillPackage.metadata.riskLevel,
    requiresApproval: skillPackage.effects.requiresApproval,
    inputArtifacts: skillPackage.interface.inputArtifacts,
    outputArtifacts: skillPackage.interface.outputArtifacts,
    invalidates: skillPackage.effects.invalidates,
    mutationKind: skillPackage.effects.mutationKind,
  }
}

export function listSkillDefinitions(): SkillDefinition[] {
  return listSkillPackages().map((skillPackage) => getSkillDefinition(skillPackage.metadata.id))
}
