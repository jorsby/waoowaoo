export const DIRECTOR_STYLE_PRESET_IDS = {
  HORROR_SUSPENSE: 'horror-suspense',
} as const

export type DirectorStylePresetId =
  (typeof DIRECTOR_STYLE_PRESET_IDS)[keyof typeof DIRECTOR_STYLE_PRESET_IDS]

