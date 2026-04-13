export const analyzePropsResources = {
  models: ['analysisModel'],
  promptFiles: [
    'skills/novel-promotion/analyze-props/prompts/template.zh.txt',
    'skills/novel-promotion/analyze-props/prompts/template.en.txt',
  ],
  loaders: ['episode.novelText', 'project.props'],
  toolAllowlist: ['executeAiTextStep'],
} as const
