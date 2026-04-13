export const refineCinematographyResources = {
  models: ['analysisModel'],
  promptFiles: [
    'skills/novel-promotion/refine-cinematography/prompts/template.zh.txt',
    'skills/novel-promotion/refine-cinematography/prompts/template.en.txt',
  ],
  loaders: ['storyboard.phase1', 'project.characters', 'project.locations', 'project.props'],
  toolAllowlist: ['executeAiTextStep'],
} as const
