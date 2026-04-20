export const refineStoryboardDetailResources = {
  models: ['analysisModel'],
  promptFiles: [
    'src/lib/ai-prompts/templates/storyboard/refine-detail/storyboard-refine-detail.zh.txt',
    'src/lib/ai-prompts/templates/storyboard/refine-detail/storyboard-refine-detail.en.txt',
  ],
  loaders: ['storyboard.phase1', 'storyboard.phase2.cinematography', 'storyboard.phase2.acting'],
  toolAllowlist: ['executeAiTextStep'],
} as const
