export const analyzeLocationsResources = {
  models: ['analysisModel'],
  promptFiles: [
    'src/lib/ai-prompts/templates/location/analyze/location-analyze.zh.txt',
    'src/lib/ai-prompts/templates/location/analyze/location-analyze.en.txt',
  ],
  loaders: ['episode.novelText', 'project.locations'],
  toolAllowlist: ['executeAiTextStep'],
} as const
