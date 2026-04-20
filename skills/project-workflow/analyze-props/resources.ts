export const analyzePropsResources = {
  models: ['analysisModel'],
  promptFiles: [
    'src/lib/ai-prompts/templates/prop/analyze/prop-analyze.zh.txt',
    'src/lib/ai-prompts/templates/prop/analyze/prop-analyze.en.txt',
  ],
  loaders: ['episode.novelText', 'project.props'],
  toolAllowlist: ['executeAiTextStep'],
} as const
