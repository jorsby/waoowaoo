export const analyzeCharactersResources = {
  models: ['analysisModel'],
  promptFiles: [
    'skills/novel-promotion/analyze-characters/prompts/template.zh.txt',
    'skills/novel-promotion/analyze-characters/prompts/template.en.txt',
  ],
  loaders: ['episode.novelText', 'project.characters'],
  toolAllowlist: ['executeAiTextStep'],
} as const
