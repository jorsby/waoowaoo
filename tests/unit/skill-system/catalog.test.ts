import { describe, expect, it } from 'vitest'
import {
  discoverSkillDocuments,
  getWorkflowPackage,
  listSkillCatalogEntries,
  listSkillPackages,
  listWorkflowPackages,
  readSkillCatalogDocument,
} from '@/lib/skill-system/catalog'

describe('skill-system catalog', () => {
  it('discovers first-phase skills and workflow packages from skills directory', () => {
    const skillPackages = listSkillPackages()
    const workflowPackages = listWorkflowPackages()
    const documents = discoverSkillDocuments()

    expect(skillPackages.map((pkg) => pkg.metadata.id)).toEqual([
      'analyze-characters',
      'analyze-locations',
      'analyze-props',
      'split-clips',
      'generate-screenplay',
      'plan-storyboard-phase1',
      'refine-cinematography',
      'refine-acting',
      'refine-storyboard-detail',
      'generate-voice-lines',
    ])
    expect(workflowPackages.map((pkg) => pkg.manifest.id)).toEqual([
      'story-to-script',
      'script-to-storyboard',
    ])
    expect(documents.map((item) => item.path)).toContain('skills/novel-promotion/analyze-characters/SKILL.md')
    expect(documents.map((item) => item.path)).toContain('skills/novel-promotion/workflows/story-to-script/WORKFLOW.md')
  })

  it('story-to-script workflow package uses fixed serial skill order', () => {
    const workflowPackage = getWorkflowPackage('story-to-script')

    expect(workflowPackage.steps.map((step) => step.skillId)).toEqual([
      'analyze-characters',
      'analyze-locations',
      'analyze-props',
      'split-clips',
      'generate-screenplay',
    ])
    expect(workflowPackage.manifest.requiresApproval).toBe(true)
  })

  it('reads skill document content from repository source files', () => {
    const catalogEntries = listSkillCatalogEntries()
    const storyWorkflow = catalogEntries.find((entry) => entry.id === 'story-to-script')
    expect(storyWorkflow).toBeTruthy()

    const content = readSkillCatalogDocument(storyWorkflow!.documentPath)
    expect(content).toContain('Fixed Skill Order')
    expect(content).toContain('analyze-characters')
  })
})
