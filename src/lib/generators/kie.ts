import { createScopedLogger, logError as _ulogError } from '@/lib/logging/core'
/**
 * KIE.ai 生成器
 *
 * 当前支持的模型：
 * - Seedance 2.0           (modelId: 'bytedance/seedance-2')
 * - Seedance 2.0 Fast      (modelId: 'bytedance/seedance-2-fast')
 * - Grok Imagine I2V       (modelId: 'grok-imagine/image-to-video')
 *
 * 特点：KIE.ai 是 ByteDance Seedance 的第三方聚合平台，与官方 ModelArk/Ark 相比
 * 不会对 AI 生成的写实风人物图做"input image may contain real person"拦截。
 *
 * API:
 * - https://docs.kie.ai/market/bytedance/seedance-2
 * - https://docs.kie.ai/market/grok-imagine/image-to-video
 */

import {
    BaseVideoGenerator,
    VideoGenerateParams,
    GenerateResult,
} from './base'
import { getProviderConfig } from '@/lib/api-config'
import { submitKieTask } from '@/lib/async-submit'

const KIE_VIDEO_MODELS = new Set<string>([
    'bytedance/seedance-2',
    'bytedance/seedance-2-fast',
    'grok-imagine/image-to-video',
])

export class KieVideoGenerator extends BaseVideoGenerator {
    protected async doGenerate(params: VideoGenerateParams): Promise<GenerateResult> {
        const { userId, imageUrl, prompt = '', options = {} } = params

        const { apiKey } = await getProviderConfig(userId, 'kie')

        const {
            duration,
            resolution,
            aspectRatio,
            generateAudio,
            firstFrameUrl,
            lastFrameUrl,
            referenceImageUrls,
            nsfwChecker,
            modelId = 'bytedance/seedance-2-fast',
        } = options as {
            duration?: number
            resolution?: string
            aspectRatio?: string
            generateAudio?: boolean
            firstFrameUrl?: string
            lastFrameUrl?: string
            referenceImageUrls?: string[]
            nsfwChecker?: boolean
            modelId?: string
            provider?: string
            modelKey?: string
        }

        const allowedOptionKeys = new Set([
            'provider',
            'modelId',
            'modelKey',
            'duration',
            'resolution',
            'aspectRatio',
            'generateAudio',
            'firstFrameUrl',
            'lastFrameUrl',
            'referenceImageUrls',
            'nsfwChecker',
        ])
        for (const [key, value] of Object.entries(options)) {
            if (value === undefined) continue
            if (!allowedOptionKeys.has(key)) {
                throw new Error(`KIE_VIDEO_OPTION_UNSUPPORTED: ${key}`)
            }
        }

        if (!KIE_VIDEO_MODELS.has(modelId)) {
            throw new Error(`KIE_VIDEO_MODEL_UNSUPPORTED: ${modelId}`)
        }

        const logger = createScopedLogger({
            module: 'worker.kie-video',
            action: 'kie_video_generate',
        })

        const isGrokImagine = modelId === 'grok-imagine/image-to-video'

        let input: Record<string, unknown>
        let logDetails: Record<string, unknown>

        if (isGrokImagine) {
            // Grok Imagine uses a unified `image_urls` array (max 7) instead of
            // first_frame_url / last_frame_url / reference_image_urls.
            const collectedImages = [
                firstFrameUrl || imageUrl,
                ...(referenceImageUrls ?? []),
            ].filter((u): u is string => typeof u === 'string' && u.length > 0)
            const uniqueImages = Array.from(new Set(collectedImages)).slice(0, 7)

            if (uniqueImages.length === 0) {
                throw new Error('KIE_GROK_IMAGINE_REQUIRES_IMAGE: at least one image_url is required')
            }
            if (lastFrameUrl) {
                logger.info({ message: 'KIE Grok Imagine does not support last_frame_url; ignoring' })
            }

            input = {
                prompt,
                image_urls: uniqueImages,
                // KIE Grok API expects duration as a string ("6"–"30").
                ...(typeof duration === 'number' ? { duration: String(duration) } : {}),
                ...(resolution ? { resolution } : {}),
                // aspect_ratio only applies in multi-image mode; single-image derives from image dims.
                ...(aspectRatio && uniqueImages.length > 1 ? { aspect_ratio: aspectRatio } : {}),
                // mode is omitted on purpose: KIE defaults to 'normal' (see plan).
                ...(typeof nsfwChecker === 'boolean' ? { nsfw_checker: nsfwChecker } : {}),
            }

            logDetails = {
                modelId,
                imageUrlsCount: uniqueImages.length,
                resolution: resolution ?? null,
                aspectRatio: uniqueImages.length > 1 ? (aspectRatio ?? null) : null,
                duration: duration ?? null,
                nsfwChecker: nsfwChecker ?? null,
            }
        } else {
            // Seedance — original logic preserved verbatim.
            const hasReferenceImages = Array.isArray(referenceImageUrls) && referenceImageUrls.length > 0
            input = {
                prompt,
                ...(resolution ? { resolution } : {}),
                ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
                ...(typeof duration === 'number' ? { duration } : {}),
                ...(typeof generateAudio === 'boolean' ? { generate_audio: generateAudio } : {}),
                ...(typeof nsfwChecker === 'boolean' ? { nsfw_checker: nsfwChecker } : {}),
            }

            // KIE Seedance mutual exclusivity: Multimodal Reference-to-Video cannot coexist
            // with first_frame_url / last_frame_url (API returns 422 otherwise).
            let resolvedFirstFrame: string | undefined
            let resolvedLastFrame: string | undefined
            if (hasReferenceImages) {
                if (firstFrameUrl || lastFrameUrl || imageUrl) {
                    logger.info({
                        message: 'KIE reference-image mode active; ignoring first/last frame per API mutual-exclusivity constraint',
                    })
                }
                input.reference_image_urls = (referenceImageUrls ?? []).slice(0, 9)
            } else {
                resolvedFirstFrame = firstFrameUrl || imageUrl
                resolvedLastFrame = lastFrameUrl
                if (resolvedFirstFrame) input.first_frame_url = resolvedFirstFrame
                if (resolvedLastFrame) input.last_frame_url = resolvedLastFrame
            }

            logDetails = {
                modelId,
                hasReferenceImages,
                referenceImageCount: hasReferenceImages ? referenceImageUrls!.length : 0,
                hasFirstFrame: !!resolvedFirstFrame,
                hasLastFrame: !!resolvedLastFrame,
                resolution: resolution ?? null,
                aspectRatio: aspectRatio ?? null,
                duration: duration ?? null,
                nsfwChecker: nsfwChecker ?? null,
            }
        }

        const body = {
            model: modelId,
            input,
        }

        logger.info({
            message: 'KIE video generation request',
            details: logDetails,
        })

        try {
            const taskId = await submitKieTask(body, apiKey)
            logger.info({ message: 'KIE video task submitted', details: { taskId } })

            return {
                success: true,
                async: true,
                requestId: taskId,
                endpoint: modelId,
                externalId: `KIE:VIDEO:${modelId}:${taskId}`,
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '未知错误'
            _ulogError(`[KIE Video] 提交失败:`, message)
            throw new Error(`KIE 视频任务提交失败: ${message}`)
        }
    }
}
