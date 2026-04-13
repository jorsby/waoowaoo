import { runStoryToScriptWorkflowPackage } from '@skills/novel-promotion/workflows/story-to-script/execute'
import type { StoryToScriptWorkflowInput, StoryToScriptWorkflowResult } from './types'

export async function runStoryToScriptSkillWorkflow(
  input: StoryToScriptWorkflowInput,
): Promise<StoryToScriptWorkflowResult> {
  return await runStoryToScriptWorkflowPackage(input)
}
