import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/api-errors'
import { getProjectModelConfig } from '@/lib/config-service'
import { TASK_TYPE } from '@/lib/task/types'
import type { ProjectAgentOperationRegistry } from './types'
import { normalizeString, submitOperationTask } from './submit-operation-task'

export function createLlmTaskOperations(): ProjectAgentOperationRegistry {
  return {
    analyze_novel: {
      id: 'analyze_novel',
      description: 'Submit novel analysis task (ANALYZE_NOVEL).',
      sideEffects: { mode: 'act', risk: 'high', billable: true, requiresConfirmation: true, longRunning: true, confirmationSummary: '将提交文本分析任务（可能计费）。确认继续后请重新调用并传入 confirmed=true。' },
      scope: 'project',
      inputSchema: z.object({
        confirmed: z.boolean().optional(),
        episodeId: z.string().optional(),
        content: z.string().optional(),
      }).passthrough(),
      outputSchema: z.unknown(),
      execute: async (ctx, input) => {
        const modelConfig = await getProjectModelConfig(ctx.projectId, ctx.userId)
        if (!modelConfig.analysisModel) {
          throw new ApiError('MISSING_CONFIG')
        }
        const payload: Record<string, unknown> = {
          ...(input as unknown as Record<string, unknown>),
          analysisModel: modelConfig.analysisModel,
          displayMode: 'detail',
        }
        const episodeId = normalizeString((input as unknown as Record<string, unknown>).episodeId) || null
        return await submitOperationTask({
          request: ctx.request,
          userId: ctx.userId,
          projectId: ctx.projectId,
          episodeId,
          type: TASK_TYPE.ANALYZE_NOVEL,
          targetType: 'Project',
          targetId: ctx.projectId,
          payload,
          dedupeKey: `analyze_novel:${ctx.projectId}:${episodeId || 'global'}`,
          priority: 1,
        })
      },
    },
    analyze_global: {
      id: 'analyze_global',
      description: 'Submit global asset analysis task (ANALYZE_GLOBAL).',
      sideEffects: { mode: 'act', risk: 'high', billable: true, requiresConfirmation: true, longRunning: true, confirmationSummary: '将提交全局资产分析任务（可能计费）。确认继续后请重新调用并传入 confirmed=true。' },
      scope: 'project',
      inputSchema: z.object({
        confirmed: z.boolean().optional(),
      }).passthrough(),
      outputSchema: z.unknown(),
      execute: async (ctx, input) => {
        const modelConfig = await getProjectModelConfig(ctx.projectId, ctx.userId)
        if (!modelConfig.analysisModel) {
          throw new ApiError('MISSING_CONFIG')
        }
        const payload: Record<string, unknown> = {
          ...(input as unknown as Record<string, unknown>),
          analysisModel: modelConfig.analysisModel,
          displayMode: 'detail',
        }
        return await submitOperationTask({
          request: ctx.request,
          userId: ctx.userId,
          projectId: ctx.projectId,
          type: TASK_TYPE.ANALYZE_GLOBAL,
          targetType: 'Project',
          targetId: ctx.projectId,
          payload,
          dedupeKey: `analyze_global:${ctx.projectId}`,
          priority: 1,
        })
      },
    },
    analyze_shot_variants: {
      id: 'analyze_shot_variants',
      description: 'Submit shot variants analysis task (ANALYZE_SHOT_VARIANTS).',
      sideEffects: { mode: 'act', risk: 'high', billable: true, requiresConfirmation: true, longRunning: true, confirmationSummary: '将提交镜头变体分析任务（可能计费）。确认继续后请重新调用并传入 confirmed=true。' },
      scope: 'panel',
      inputSchema: z.object({
        confirmed: z.boolean().optional(),
        panelId: z.string().min(1),
        episodeId: z.string().optional(),
      }).passthrough(),
      outputSchema: z.unknown(),
      execute: async (ctx, input) => {
        const modelConfig = await getProjectModelConfig(ctx.projectId, ctx.userId)
        if (!modelConfig.analysisModel) {
          throw new ApiError('MISSING_CONFIG')
        }
        const payload: Record<string, unknown> = {
          ...(input as unknown as Record<string, unknown>),
          analysisModel: modelConfig.analysisModel,
          displayMode: 'detail',
        }
        const episodeId = normalizeString((input as unknown as Record<string, unknown>).episodeId) || null
        return await submitOperationTask({
          request: ctx.request,
          userId: ctx.userId,
          projectId: ctx.projectId,
          episodeId,
          type: TASK_TYPE.ANALYZE_SHOT_VARIANTS,
          targetType: 'ProjectPanel',
          targetId: input.panelId,
          payload,
          dedupeKey: `analyze_shot_variants:${input.panelId}`,
          priority: 1,
        })
      },
    },
    screenplay_convert: {
      id: 'screenplay_convert',
      description: 'Submit screenplay conversion task (SCREENPLAY_CONVERT).',
      sideEffects: { mode: 'act', risk: 'high', billable: true, requiresConfirmation: true, longRunning: true, confirmationSummary: '将提交 clips→screenplay 转换任务（可能计费）。确认继续后请重新调用并传入 confirmed=true。' },
      scope: 'episode',
      inputSchema: z.object({
        confirmed: z.boolean().optional(),
        episodeId: z.string().min(1),
      }).passthrough(),
      outputSchema: z.unknown(),
      execute: async (ctx, input) => {
        const modelConfig = await getProjectModelConfig(ctx.projectId, ctx.userId)
        if (!modelConfig.analysisModel) {
          throw new ApiError('MISSING_CONFIG')
        }
        const payload: Record<string, unknown> = {
          ...(input as unknown as Record<string, unknown>),
          analysisModel: modelConfig.analysisModel,
          displayMode: 'detail',
        }
        return await submitOperationTask({
          request: ctx.request,
          userId: ctx.userId,
          projectId: ctx.projectId,
          episodeId: input.episodeId,
          type: TASK_TYPE.SCREENPLAY_CONVERT,
          targetType: 'ProjectEpisode',
          targetId: input.episodeId,
          payload,
          dedupeKey: `screenplay_convert:${input.episodeId}`,
          priority: 2,
        })
      },
    },
    story_to_script_run: {
      id: 'story_to_script_run',
      description: 'Submit story-to-script run task (STORY_TO_SCRIPT_RUN) for internal streaming/observe flows.',
      sideEffects: { mode: 'act', risk: 'high', billable: true, requiresConfirmation: true, longRunning: true, confirmationSummary: '将提交 story-to-script 运行任务（可能计费）。确认继续后请重新调用并传入 confirmed=true。' },
      scope: 'episode',
      inputSchema: z.object({
        confirmed: z.boolean().optional(),
        episodeId: z.string().min(1),
        content: z.string().min(1).optional(),
      }).passthrough(),
      outputSchema: z.unknown(),
      execute: async (ctx, input) => {
        const modelConfig = await getProjectModelConfig(ctx.projectId, ctx.userId)
        if (!modelConfig.analysisModel) {
          throw new ApiError('MISSING_CONFIG')
        }
        const payload: Record<string, unknown> = {
          ...(input as unknown as Record<string, unknown>),
          analysisModel: modelConfig.analysisModel,
          displayMode: 'detail',
        }
        return await submitOperationTask({
          request: ctx.request,
          userId: ctx.userId,
          projectId: ctx.projectId,
          episodeId: input.episodeId,
          type: TASK_TYPE.STORY_TO_SCRIPT_RUN,
          targetType: 'ProjectEpisode',
          targetId: input.episodeId,
          payload,
          dedupeKey: `story_to_script_run:${input.episodeId}`,
          priority: 2,
        })
      },
    },
    script_to_storyboard_run: {
      id: 'script_to_storyboard_run',
      description: 'Submit script-to-storyboard run task (SCRIPT_TO_STORYBOARD_RUN) for internal streaming/observe flows.',
      sideEffects: { mode: 'act', risk: 'high', billable: true, requiresConfirmation: true, longRunning: true, confirmationSummary: '将提交 script-to-storyboard 运行任务（可能计费）。确认继续后请重新调用并传入 confirmed=true。' },
      scope: 'episode',
      inputSchema: z.object({
        confirmed: z.boolean().optional(),
        episodeId: z.string().min(1),
      }).passthrough(),
      outputSchema: z.unknown(),
      execute: async (ctx, input) => {
        const modelConfig = await getProjectModelConfig(ctx.projectId, ctx.userId)
        if (!modelConfig.analysisModel) {
          throw new ApiError('MISSING_CONFIG')
        }
        const payload: Record<string, unknown> = {
          ...(input as unknown as Record<string, unknown>),
          analysisModel: modelConfig.analysisModel,
          displayMode: 'detail',
        }
        return await submitOperationTask({
          request: ctx.request,
          userId: ctx.userId,
          projectId: ctx.projectId,
          episodeId: input.episodeId,
          type: TASK_TYPE.SCRIPT_TO_STORYBOARD_RUN,
          targetType: 'ProjectEpisode',
          targetId: input.episodeId,
          payload,
          dedupeKey: `script_to_storyboard_run:${input.episodeId}`,
          priority: 2,
        })
      },
    },
    voice_analyze: {
      id: 'voice_analyze',
      description: 'Submit voice analysis task (VOICE_ANALYZE).',
      sideEffects: { mode: 'act', risk: 'high', billable: true, requiresConfirmation: true, longRunning: true, confirmationSummary: '将提交台词分析任务（可能计费）。确认继续后请重新调用并传入 confirmed=true。' },
      scope: 'episode',
      inputSchema: z.object({
        confirmed: z.boolean().optional(),
        episodeId: z.string().min(1),
      }).passthrough(),
      outputSchema: z.unknown(),
      execute: async (ctx, input) => {
        const modelConfig = await getProjectModelConfig(ctx.projectId, ctx.userId)
        if (!modelConfig.analysisModel) {
          throw new ApiError('MISSING_CONFIG')
        }
        const payload: Record<string, unknown> = {
          ...(input as unknown as Record<string, unknown>),
          analysisModel: modelConfig.analysisModel,
          displayMode: 'detail',
        }
        return await submitOperationTask({
          request: ctx.request,
          userId: ctx.userId,
          projectId: ctx.projectId,
          episodeId: input.episodeId,
          type: TASK_TYPE.VOICE_ANALYZE,
          targetType: 'ProjectEpisode',
          targetId: input.episodeId,
          payload,
          dedupeKey: `voice_analyze:${input.episodeId}`,
          priority: 1,
        })
      },
    },
    ai_modify_appearance: {
      id: 'ai_modify_appearance',
      description: 'Submit AI modify appearance task.',
      sideEffects: { mode: 'act', risk: 'high', billable: true, requiresConfirmation: true, longRunning: true, confirmationSummary: '将提交 AI 形象修改任务（可能计费）。确认继续后请重新调用并传入 confirmed=true。' },
      scope: 'asset',
      inputSchema: z.object({
        confirmed: z.boolean().optional(),
        characterId: z.string().min(1),
        appearanceId: z.string().min(1),
        currentDescription: z.string().min(1),
        modifyInstruction: z.string().min(1),
      }).passthrough(),
      outputSchema: z.unknown(),
      execute: async (ctx, input) =>
        submitOperationTask({
          request: ctx.request,
          userId: ctx.userId,
          projectId: ctx.projectId,
          type: TASK_TYPE.AI_MODIFY_APPEARANCE,
          targetType: 'CharacterAppearance',
          targetId: input.appearanceId,
          payload: input as unknown as Record<string, unknown>,
          dedupeKey: `ai_modify_appearance:${input.appearanceId}`,
        }),
    },
    ai_modify_prop: {
      id: 'ai_modify_prop',
      description: 'Submit AI modify prop task.',
      sideEffects: { mode: 'act', risk: 'high', billable: true, requiresConfirmation: true, longRunning: true, confirmationSummary: '将提交 AI 道具修改任务（可能计费）。确认继续后请重新调用并传入 confirmed=true。' },
      scope: 'asset',
      inputSchema: z.object({
        confirmed: z.boolean().optional(),
        propId: z.string().min(1),
        variantId: z.string().optional(),
        currentDescription: z.string().min(1),
        modifyInstruction: z.string().min(1),
      }).passthrough(),
      outputSchema: z.unknown(),
      execute: async (ctx, input) => {
        const propId = normalizeString((input as unknown as Record<string, unknown>).propId)
        const variantId = normalizeString((input as unknown as Record<string, unknown>).variantId) || undefined

        const prop = await prisma.projectLocation.findFirst({
          where: {
            id: propId,
            projectId: ctx.projectId,
            assetKind: 'prop',
          },
          select: {
            id: true,
            name: true,
          },
        })
        if (!prop) {
          throw new ApiError('NOT_FOUND')
        }

        return await submitOperationTask({
          request: ctx.request,
          userId: ctx.userId,
          projectId: ctx.projectId,
          type: TASK_TYPE.AI_MODIFY_PROP,
          targetType: 'ProjectLocation',
          targetId: variantId || propId,
          payload: {
            ...(input as unknown as Record<string, unknown>),
            propId,
            propName: prop.name,
            ...(variantId ? { variantId } : {}),
          },
          dedupeKey: `ai_modify_prop:${propId}:${variantId || 'default'}`,
        })
      },
    },
    ai_modify_shot_prompt: {
      id: 'ai_modify_shot_prompt',
      description: 'Submit AI modify shot prompt task.',
      sideEffects: { mode: 'act', risk: 'high', billable: true, requiresConfirmation: true, longRunning: true, confirmationSummary: '将提交 AI 镜头提示词修改任务（可能计费）。确认继续后请重新调用并传入 confirmed=true。' },
      scope: 'panel',
      inputSchema: z.object({
        confirmed: z.boolean().optional(),
        panelId: z.string().optional(),
        episodeId: z.string().optional(),
        currentPrompt: z.string().min(1),
        modifyInstruction: z.string().min(1),
      }).passthrough(),
      outputSchema: z.unknown(),
      execute: async (ctx, input) => {
        const panelId = normalizeString((input as unknown as Record<string, unknown>).panelId)
        const episodeId = normalizeString((input as unknown as Record<string, unknown>).episodeId) || null

        return await submitOperationTask({
          request: ctx.request,
          userId: ctx.userId,
          projectId: ctx.projectId,
          episodeId,
          type: TASK_TYPE.AI_MODIFY_SHOT_PROMPT,
          targetType: panelId ? 'ProjectPanel' : 'Project',
          targetId: panelId || ctx.projectId,
          payload: input as unknown as Record<string, unknown>,
          dedupeKey: panelId ? `ai_modify_shot_prompt:${panelId}` : `ai_modify_shot_prompt:${ctx.projectId}`,
        })
      },
    },
  }
}

