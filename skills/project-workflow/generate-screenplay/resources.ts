export const generateScreenplayResources = {
  models: ['analysisModel'],
  promptFiles: [
    'src/lib/ai-prompts/templates/script/generate-screenplay/script-generate-screenplay.zh.txt',
    'src/lib/ai-prompts/templates/script/generate-screenplay/script-generate-screenplay.en.txt',
  ],
  loaders: ['clip.split', 'analysis.characters', 'analysis.locations', 'analysis.props'],
  toolAllowlist: ['executeAiTextStep'],
} as const
