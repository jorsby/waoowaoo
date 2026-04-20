export const splitClipsResources = {
  models: ['analysisModel'],
  promptFiles: [
    'src/lib/ai-prompts/templates/script/clip-segments/script-clip-segments.zh.txt',
    'src/lib/ai-prompts/templates/script/clip-segments/script-clip-segments.en.txt',
  ],
  loaders: ['episode.novelText', 'analysis.characters', 'analysis.locations', 'analysis.props'],
  toolAllowlist: ['executeAiTextStep', 'createClipContentMatcher'],
} as const
