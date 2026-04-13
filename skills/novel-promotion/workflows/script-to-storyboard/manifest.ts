import { z } from 'zod'
import { TASK_TYPE } from '@/lib/task/types'
import type { WorkflowPackage } from '@/lib/skill-system/types'

export const scriptToStoryboardWorkflowInputSchema = z.object({
  concurrency: z.number().int().positive().optional(),
  locale: z.enum(['zh', 'en']).optional(),
  clips: z.array(z.object({
    id: z.string(),
    content: z.string().nullable(),
    screenplay: z.string().nullable(),
  }).passthrough()),
  novelPromotionData: z.object({
    characters: z.array(z.record(z.unknown())),
    locations: z.array(z.record(z.unknown())),
    props: z.array(z.record(z.unknown())).optional(),
  }),
  novelText: z.string(),
  runStep: z.function(),
})

export const scriptToStoryboardWorkflowOutputSchema = z.object({
  summary: z.object({
    clipCount: z.number().int().nonnegative(),
    totalPanelCount: z.number().int().nonnegative(),
    totalStepCount: z.number().int().positive(),
  }),
}).passthrough()

export const scriptToStoryboardWorkflowManifest: WorkflowPackage['manifest'] = {
  id: 'script-to-storyboard',
  name: 'Script To Storyboard',
  summary: 'Transform screenplay clips into storyboard and voice artifacts in a fixed sequence.',
  description: 'Fixed workflow package for screenplay -> storyboard conversion.',
  taskType: TASK_TYPE.SCRIPT_TO_STORYBOARD_RUN,
  workflowType: TASK_TYPE.SCRIPT_TO_STORYBOARD_RUN,
  requiresApproval: true,
}
