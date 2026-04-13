import type { WorkflowPackage } from '@/lib/skill-system/types'
import {
  scriptToStoryboardWorkflowInputSchema,
  scriptToStoryboardWorkflowManifest,
  scriptToStoryboardWorkflowOutputSchema,
} from './manifest'
import { runScriptToStoryboardWorkflowPackage } from './execute'
import { ScriptToStoryboardWorkflowRender } from './render'

const scriptToStoryboardWorkflowPackage: WorkflowPackage = {
  kind: 'workflow',
  manifest: scriptToStoryboardWorkflowManifest,
  documentPath: 'skills/novel-promotion/workflows/script-to-storyboard/WORKFLOW.md',
  inputSchema: scriptToStoryboardWorkflowInputSchema,
  outputSchema: scriptToStoryboardWorkflowOutputSchema,
  steps: [
    {
      orderIndex: 0,
      skillId: 'plan-storyboard-phase1',
      title: 'Plan Storyboard Phase 1',
      dependsOn: [],
    },
    {
      orderIndex: 1,
      skillId: 'refine-cinematography',
      title: 'Refine Cinematography',
      dependsOn: ['plan-storyboard-phase1'],
    },
    {
      orderIndex: 2,
      skillId: 'refine-acting',
      title: 'Refine Acting',
      dependsOn: ['refine-cinematography'],
    },
    {
      orderIndex: 3,
      skillId: 'refine-storyboard-detail',
      title: 'Refine Storyboard Detail',
      dependsOn: ['refine-acting'],
    },
    {
      orderIndex: 4,
      skillId: 'generate-voice-lines',
      title: 'Generate Voice Lines',
      dependsOn: ['refine-storyboard-detail'],
    },
  ],
  execute: async (input) => await runScriptToStoryboardWorkflowPackage(input as Parameters<typeof runScriptToStoryboardWorkflowPackage>[0]),
  render: ScriptToStoryboardWorkflowRender,
}

export default scriptToStoryboardWorkflowPackage
