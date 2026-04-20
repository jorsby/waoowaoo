export const DIRECTOR_STYLE_DOC_FIELDS = [
  'character',
  'location',
  'prop',
  'storyboardPlan',
  'cinematography',
  'acting',
  'storyboardDetail',
  'image',
  'video',
] as const

export type DirectorStyleDocField = (typeof DIRECTOR_STYLE_DOC_FIELDS)[number]

export interface DirectorStyleDoc {
  character: string
  location: string
  prop: string
  storyboardPlan: string
  cinematography: string
  acting: string
  storyboardDetail: string
  image: string
  video: string
}

