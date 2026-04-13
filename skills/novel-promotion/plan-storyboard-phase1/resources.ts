export const planStoryboardPhase1Resources = {
  models: ['analysisModel'],
  promptFiles: [
    'skills/novel-promotion/plan-storyboard-phase1/prompts/template.zh.txt',
    'skills/novel-promotion/plan-storyboard-phase1/prompts/template.en.txt',
  ],
  loaders: ['clip.screenplay', 'project.characters', 'project.locations', 'project.props'],
  toolAllowlist: ['executeAiTextStep'],
} as const
