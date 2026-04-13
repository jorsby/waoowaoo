import type { WorkflowPackage } from '@/lib/skill-system/types'
import { storyToScriptWorkflowManifest, storyToScriptWorkflowInputSchema, storyToScriptWorkflowOutputSchema } from './manifest'
import { runStoryToScriptWorkflowPackage } from './execute'
import { StoryToScriptWorkflowRender } from './render'

const storyToScriptWorkflowPackage: WorkflowPackage = {
  kind: 'workflow',
  manifest: storyToScriptWorkflowManifest,
  documentPath: 'skills/novel-promotion/workflows/story-to-script/WORKFLOW.md',
  inputSchema: storyToScriptWorkflowInputSchema,
  outputSchema: storyToScriptWorkflowOutputSchema,
  steps: [
    {
      orderIndex: 0,
      skillId: 'analyze-characters',
      title: 'Analyze Characters',
      dependsOn: [],
    },
    {
      orderIndex: 1,
      skillId: 'analyze-locations',
      title: 'Analyze Locations',
      dependsOn: ['analyze-characters'],
    },
    {
      orderIndex: 2,
      skillId: 'analyze-props',
      title: 'Analyze Props',
      dependsOn: ['analyze-locations'],
    },
    {
      orderIndex: 3,
      skillId: 'split-clips',
      title: 'Split Clips',
      dependsOn: ['analyze-props'],
    },
    {
      orderIndex: 4,
      skillId: 'generate-screenplay',
      title: 'Generate Screenplay',
      dependsOn: ['split-clips'],
    },
  ],
  execute: async (input) => await runStoryToScriptWorkflowPackage(input as Parameters<typeof runStoryToScriptWorkflowPackage>[0]),
  render: StoryToScriptWorkflowRender,
}

export default storyToScriptWorkflowPackage
