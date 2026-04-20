export const generateVoiceLinesResources = {
  models: ['analysisModel'],
  promptFiles: [
    'src/lib/ai-prompts/templates/voice/generate-lines/voice-generate-lines.zh.txt',
    'src/lib/ai-prompts/templates/voice/generate-lines/voice-generate-lines.en.txt',
  ],
  loaders: ['storyboard.panel_set', 'story.raw', 'project.characters'],
  toolAllowlist: ['executeAiTextStep'],
} as const
