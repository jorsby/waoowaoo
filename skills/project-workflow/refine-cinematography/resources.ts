export const refineCinematographyResources = {
  models: ['analysisModel'],
  promptFiles: [
    'src/lib/ai-prompts/templates/storyboard/refine-cinematography/storyboard-refine-cinematography.zh.txt',
    'src/lib/ai-prompts/templates/storyboard/refine-cinematography/storyboard-refine-cinematography.en.txt',
  ],
  loaders: ['storyboard.phase1', 'project.characters', 'project.locations', 'project.props'],
  toolAllowlist: ['executeAiTextStep'],
} as const
