export const generateScreenplayResources = {
  models: ['analysisModel'],
  promptFiles: [
    'skills/novel-promotion/generate-screenplay/prompts/template.zh.txt',
    'skills/novel-promotion/generate-screenplay/prompts/template.en.txt',
  ],
  loaders: ['clip.split', 'analysis.characters', 'analysis.locations', 'analysis.props'],
  toolAllowlist: ['executeAiTextStep'],
} as const
