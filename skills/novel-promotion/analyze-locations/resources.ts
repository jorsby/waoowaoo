export const analyzeLocationsResources = {
  models: ['analysisModel'],
  promptFiles: [
    'skills/novel-promotion/analyze-locations/prompts/template.zh.txt',
    'skills/novel-promotion/analyze-locations/prompts/template.en.txt',
  ],
  loaders: ['episode.novelText', 'project.locations'],
  toolAllowlist: ['executeAiTextStep'],
} as const
