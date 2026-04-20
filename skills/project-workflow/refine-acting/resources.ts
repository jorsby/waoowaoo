export const refineActingResources = {
  models: ['analysisModel'],
  promptFiles: [
    'src/lib/ai-prompts/templates/storyboard/refine-acting/storyboard-refine-acting.zh.txt',
    'src/lib/ai-prompts/templates/storyboard/refine-acting/storyboard-refine-acting.en.txt',
  ],
  loaders: ['storyboard.phase1', 'project.characters'],
  toolAllowlist: ['executeAiTextStep'],
} as const
