export const analyzeCharactersResources = {
  models: ['analysisModel'],
  promptFiles: [
    'src/lib/ai-prompts/templates/character/analyze/character-analyze.zh.txt',
    'src/lib/ai-prompts/templates/character/analyze/character-analyze.en.txt',
  ],
  loaders: ['episode.novelText', 'project.characters'],
  toolAllowlist: ['executeAiTextStep'],
} as const
