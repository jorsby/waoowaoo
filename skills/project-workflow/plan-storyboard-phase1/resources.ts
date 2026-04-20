export const planStoryboardPhase1Resources = {
  models: ['analysisModel'],
  promptFiles: [
    'src/lib/ai-prompts/templates/storyboard/plan/storyboard-plan.zh.txt',
    'src/lib/ai-prompts/templates/storyboard/plan/storyboard-plan.en.txt',
  ],
  loaders: ['clip.screenplay', 'project.characters', 'project.locations', 'project.props'],
  toolAllowlist: ['executeAiTextStep'],
} as const
