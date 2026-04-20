import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/api-errors'
import { copyAssetFromGlobal } from '@/lib/assets/services/asset-actions'
import { getProjectCostDetails } from '@/lib/billing'
import { BILLING_CURRENCY } from '@/lib/billing/currency'
import { attachMediaFieldsToProject } from '@/lib/media/attach'
import { buildProjectReadModel } from '@/lib/projects/build-project-read-model'
import { logError } from '@/lib/logging/core'
import type { ProjectAgentOperationRegistry } from './types'

function readAssetKind(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'location'
  const record = value as Record<string, unknown>
  return typeof record.assetKind === 'string' ? record.assetKind : 'location'
}

export function createProjectDataOperations(): ProjectAgentOperationRegistry {
  return {
    get_project_assets: {
      id: 'get_project_assets',
      description: 'Load project assets (characters, locations, props) with stable media URLs.',
      sideEffects: { mode: 'query', risk: 'low' },
      scope: 'project',
      inputSchema: z.object({}),
      outputSchema: z.unknown(),
      execute: async (ctx) => {
        const projectWithAssets = await prisma.project.findUnique({
          where: { id: ctx.projectId },
          include: {
            characters: {
              include: {
                appearances: {
                  orderBy: { appearanceIndex: 'asc' },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
            locations: {
              include: {
                images: {
                  orderBy: { imageIndex: 'asc' },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        })

        if (!projectWithAssets) {
          throw new ApiError('NOT_FOUND')
        }

        const withSignedUrls = await attachMediaFieldsToProject(projectWithAssets)
        const locations = (withSignedUrls.locations || []).filter((item) => readAssetKind(item) !== 'prop')
        const props = (withSignedUrls.locations || []).filter((item) => readAssetKind(item) === 'prop')

        return {
          characters: withSignedUrls.characters || [],
          locations,
          props,
        }
      },
    },

    copy_asset_from_global: {
      id: 'copy_asset_from_global',
      description: 'Copy a global asset into the current project asset record.',
      sideEffects: { mode: 'act', risk: 'low' },
      scope: 'asset',
      inputSchema: z.object({
        type: z.enum(['character', 'location', 'voice']),
        targetId: z.string().min(1),
        globalAssetId: z.string().min(1),
      }),
      outputSchema: z.unknown(),
      execute: async (ctx, input) =>
        copyAssetFromGlobal({
          kind: input.type,
          targetId: input.targetId,
          globalAssetId: input.globalAssetId,
          access: {
            userId: ctx.userId,
            projectId: ctx.projectId,
          },
        }),
    },

    update_storyboard_photography_plan: {
      id: 'update_storyboard_photography_plan',
      description: 'Update a storyboard photography plan JSON payload.',
      sideEffects: { mode: 'act', risk: 'low' },
      scope: 'storyboard',
      inputSchema: z.object({
        storyboardId: z.string().min(1),
        photographyPlan: z.unknown().optional().nullable(),
      }),
      outputSchema: z.object({
        success: z.literal(true),
      }),
      execute: async (ctx, input) => {
        const storyboard = await prisma.projectStoryboard.findUnique({
          where: { id: input.storyboardId },
          select: { id: true, episodeId: true },
        })

        if (!storyboard) {
          throw new ApiError('NOT_FOUND')
        }

        const episode = await prisma.projectEpisode.findUnique({
          where: { id: storyboard.episodeId },
          select: { projectId: true },
        })

        if (!episode || episode.projectId !== ctx.projectId) {
          throw new ApiError('NOT_FOUND')
        }

        const photographyPlanJson = input.photographyPlan === undefined || input.photographyPlan === null
          ? null
          : JSON.stringify(input.photographyPlan)

        await prisma.projectStoryboard.update({
          where: { id: input.storyboardId },
          data: { photographyPlan: photographyPlanJson },
        })

        return { success: true }
      },
    },

    get_project_costs: {
      id: 'get_project_costs',
      description: 'Load project cost breakdown for the project owner.',
      sideEffects: { mode: 'query', risk: 'low' },
      scope: 'project',
      inputSchema: z.object({}),
      outputSchema: z.unknown(),
      execute: async (ctx) => {
        const project = await prisma.project.findUnique({
          where: { id: ctx.projectId },
          select: { userId: true, name: true },
        })

        if (!project) {
          throw new ApiError('NOT_FOUND')
        }

        if (project.userId !== ctx.userId) {
          throw new ApiError('FORBIDDEN')
        }

        const costDetails = await getProjectCostDetails(ctx.projectId)

        return {
          projectId: ctx.projectId,
          projectName: project.name,
          currency: BILLING_CURRENCY,
          ...costDetails,
        }
      },
    },

    get_project_data: {
      id: 'get_project_data',
      description: 'Load unified project data payload for the project owner (includes workflow and assets).',
      sideEffects: { mode: 'act', risk: 'low' },
      scope: 'project',
      inputSchema: z.object({}),
      outputSchema: z.unknown(),
      execute: async (ctx) => {
        const project = await prisma.project.findUnique({
          where: { id: ctx.projectId },
          include: { user: true },
        })

        if (!project) {
          throw new ApiError('NOT_FOUND')
        }

        if (project.userId !== ctx.userId) {
          throw new ApiError('FORBIDDEN')
        }

        prisma.project.update({
          where: { id: ctx.projectId },
          data: { lastAccessedAt: new Date() },
        }).catch((error: unknown) => logError('update lastAccessedAt failed', error))

        const projectWithWorkflow = await prisma.project.findUnique({
          where: { id: ctx.projectId },
          include: {
            episodes: {
              orderBy: { episodeNumber: 'asc' },
            },
            characters: {
              include: {
                appearances: true,
              },
              orderBy: { createdAt: 'asc' },
            },
            locations: {
              include: {
                images: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        })

        if (!projectWithWorkflow) {
          throw new ApiError('NOT_FOUND')
        }

        const projectWithSignedUrls = await attachMediaFieldsToProject(projectWithWorkflow)
        const fullProject = buildProjectReadModel(projectWithWorkflow, projectWithSignedUrls)

        return { project: fullProject }
      },
    },
  }
}
