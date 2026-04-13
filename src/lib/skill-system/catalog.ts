import fs from 'fs'
import path from 'path'
import analyzeCharactersSkillPackage from '@skills/novel-promotion/analyze-characters'
import analyzeLocationsSkillPackage from '@skills/novel-promotion/analyze-locations'
import analyzePropsSkillPackage from '@skills/novel-promotion/analyze-props'
import generateScreenplaySkillPackage from '@skills/novel-promotion/generate-screenplay'
import generateVoiceLinesSkillPackage from '@skills/novel-promotion/generate-voice-lines'
import planStoryboardPhase1SkillPackage from '@skills/novel-promotion/plan-storyboard-phase1'
import refineActingSkillPackage from '@skills/novel-promotion/refine-acting'
import refineCinematographySkillPackage from '@skills/novel-promotion/refine-cinematography'
import refineStoryboardDetailSkillPackage from '@skills/novel-promotion/refine-storyboard-detail'
import splitClipsSkillPackage from '@skills/novel-promotion/split-clips'
import scriptToStoryboardWorkflowPackage from '@skills/novel-promotion/workflows/script-to-storyboard'
import storyToScriptWorkflowPackage from '@skills/novel-promotion/workflows/story-to-script'
import type {
  SkillCatalogEntry,
  SkillPackage,
  WorkflowPackage,
  WorkflowPackageId,
  WorkflowSkillId,
} from './types'

const skillPackages: Record<WorkflowSkillId, SkillPackage> = {
  'analyze-characters': analyzeCharactersSkillPackage,
  'analyze-locations': analyzeLocationsSkillPackage,
  'analyze-props': analyzePropsSkillPackage,
  'split-clips': splitClipsSkillPackage,
  'generate-screenplay': generateScreenplaySkillPackage,
  'plan-storyboard-phase1': planStoryboardPhase1SkillPackage,
  'refine-cinematography': refineCinematographySkillPackage,
  'refine-acting': refineActingSkillPackage,
  'refine-storyboard-detail': refineStoryboardDetailSkillPackage,
  'generate-voice-lines': generateVoiceLinesSkillPackage,
}

const workflowPackages: Record<WorkflowPackageId, WorkflowPackage> = {
  'story-to-script': storyToScriptWorkflowPackage,
  'script-to-storyboard': scriptToStoryboardWorkflowPackage,
}

function skillsRoot(): string {
  return path.resolve(process.cwd(), 'skills', 'novel-promotion')
}

function walkFiles(rootDir: string): string[] {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const nextPath = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(nextPath))
      continue
    }
    files.push(nextPath)
  }
  return files
}

function relativeSkillPath(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath).replace(/\\/g, '/')
}

export function getSkillPackage(skillId: WorkflowSkillId): SkillPackage {
  return skillPackages[skillId]
}

export function listSkillPackages(): SkillPackage[] {
  return Object.values(skillPackages)
}

export function getWorkflowPackage(workflowId: WorkflowPackageId): WorkflowPackage {
  return workflowPackages[workflowId]
}

export function listWorkflowPackages(): WorkflowPackage[] {
  return Object.values(workflowPackages)
}

export function findWorkflowSkillPackageByLegacyStepId(stepId: string): SkillPackage | null {
  for (const skillPackage of Object.values(skillPackages)) {
    if (skillPackage.legacyStepIds.includes(stepId)) return skillPackage
  }
  return null
}

export function listSkillCatalogEntries(): SkillCatalogEntry[] {
  const skills = listSkillPackages().map((skillPackage) => ({
    id: skillPackage.metadata.id,
    kind: 'skill' as const,
    name: skillPackage.metadata.name,
    summary: skillPackage.metadata.summary,
    description: skillPackage.metadata.description,
    documentPath: skillPackage.instructions.documentPath,
  }))
  const workflows = listWorkflowPackages().map((workflowPackage) => ({
    id: workflowPackage.manifest.id,
    kind: 'workflow' as const,
    name: workflowPackage.manifest.name,
    summary: workflowPackage.manifest.summary,
    description: workflowPackage.manifest.description,
    documentPath: workflowPackage.documentPath,
  }))
  return [...workflows, ...skills]
}

export function discoverSkillDocuments(): Array<{ kind: 'skill' | 'workflow'; path: string }> {
  return walkFiles(skillsRoot())
    .filter((filePath) => filePath.endsWith('/SKILL.md') || filePath.endsWith('/WORKFLOW.md'))
    .map((filePath) => ({
      kind: filePath.endsWith('/SKILL.md') ? 'skill' as const : 'workflow' as const,
      path: relativeSkillPath(filePath),
    }))
}

export function readSkillCatalogDocument(documentPath: string): string {
  const filePath = path.resolve(process.cwd(), documentPath)
  return fs.readFileSync(filePath, 'utf8').trim()
}
