import { logInfo as _ulogInfo, logError as _ulogError } from '@/lib/logging/core'
import { buildFalQueueUrl } from '@/lib/providers/fal/base-url'
/**
 * 异步任务提交工具
 * 
 * 核心功能：
 * 1. 提交任务到外部平台（FAL/Ark）
 * 2. 查询任务状态
 * 3. 下载并保存结果
 */

// 注意：API Key 现在通过参数传入，不再使用环境变量

// ==================== FAL 队列模式 ====================

/**
 * 提交FAL任务到队列
 * @param endpoint FAL端点，如 'wan/v2.6/image-to-video'
 * @param input 请求参数
 * @param apiKey FAL API Key
 * @returns request_id
 */
export async function submitFalTask(endpoint: string, input: Record<string, unknown>, apiKey: string): Promise<string> {
    if (!apiKey) {
        throw new Error('请配置 FAL API Key')
    }

    const response = await fetch(buildFalQueueUrl(endpoint), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${apiKey}`
        },
        body: JSON.stringify(input)
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`FAL提交失败 (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    const requestId = data.request_id

    if (!requestId) {
        throw new Error('FAL未返回request_id')
    }

    _ulogInfo(`[FAL Queue] 任务已提交: ${requestId}`)
    return requestId
}

/**
 * 解析 FAL 端点 ID
 * 根据官方客户端逻辑，端点格式为: owner/alias/path
 * 例如: fal-ai/veo3.1/fast/image-to-video
 *   -> owner = fal-ai
 *   -> alias = veo3.1
 *   -> path = fast/image-to-video (状态查询时忽略)
 */
function parseFalEndpointId(endpoint: string): { owner: string; alias: string; path?: string } {
    const parts = endpoint.split('/')
    return {
        owner: parts[0],
        alias: parts[1],
        path: parts.slice(2).join('/') || undefined
    }
}

/**
 * 查询FAL任务状态
 * @param endpoint FAL端点
 * @param requestId 任务ID
 * @param apiKey FAL API Key
 */
export async function queryFalStatus(endpoint: string, requestId: string, apiKey: string): Promise<{
    status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
    completed: boolean
    failed: boolean
    resultUrl?: string
    error?: string
}> {
    if (!apiKey) {
        throw new Error('请配置 FAL API Key')
    }

    // 🔥 根据 FAL 官方客户端逻辑解析端点 ID
    // 端点格式: owner/alias/path (path 部分在状态查询时忽略)
    // 例如: fal-ai/veo3.1/fast/image-to-video -> fal-ai/veo3.1
    const parsed = parseFalEndpointId(endpoint)
    const baseEndpoint = `${parsed.owner}/${parsed.alias}`

    if (parsed.path) {
        _ulogInfo(`[FAL Status] 解析端点 ${endpoint} -> ${baseEndpoint} (忽略路径: ${parsed.path})`)
    }

    const statusUrl = buildFalQueueUrl(`${baseEndpoint}/requests/${requestId}/status?logs=0`)

    // FAL 状态查询使用 GET 方法
    const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Key ${apiKey}`
        }
    })

    if (!response.ok) {
        return {
            status: 'IN_PROGRESS',
            completed: false,
            failed: false
        }
    }

    const data = await response.json()
    const status = data.status as 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

    // 🔥 诊断日志：查看 FAL 返回的真实状态
    _ulogInfo(`[FAL Status] requestId=${requestId.slice(0, 16)}... 状态=${status}`)

    if (status === 'COMPLETED') {
        // 🔥 尝试获取完整结果
        // 优先使用返回的 response_url，如果没有则构建 URL
        // 注意：获取结果必须使用完整的原始端点（包括 /edit 等路径），而不是 baseEndpoint
        // 否则 FAL 会把请求当作新任务处理，导致 422 错误（缺少 image_urls 等必需参数）
        const resultUrl = data.response_url || buildFalQueueUrl(`${endpoint}/requests/${requestId}`)
        _ulogInfo(`[FAL Status] 任务已完成，获取结果: ${resultUrl}`)

        const resultResponse = await fetch(resultUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Key ${apiKey}`,
                'Accept': 'application/json'
            }
        })

        if (resultResponse.ok) {
            const resultData = await resultResponse.json()

            // 根据类型提取URL
            const videoUrl = resultData.video?.url
            const audioUrl = resultData.audio?.url
            const imageUrl = resultData.images?.[0]?.url

            _ulogInfo(`[FAL Status] 获取结果成功: video=${!!videoUrl}, audio=${!!audioUrl}, image=${!!imageUrl}`)

            return {
                status: 'COMPLETED',
                completed: true,
                failed: false,
                resultUrl: videoUrl || audioUrl || imageUrl
            }
        } else {
            // 🔥 获取结果失败，记录详细错误
            const errorText = await resultResponse.text()
            _ulogError(`[FAL Status] 获取结果失败 (${resultResponse.status}): ${errorText.slice(0, 300)}`)

            // 如果是 422 错误，可能是内容审核未通过或结果已过期
            if (resultResponse.status === 422) {
                // 尝试解析具体错误类型
                let errorMessage = '无法获取结果'
                try {
                    const errorJson = JSON.parse(errorText)
                    const errorType = errorJson.detail?.[0]?.type
                    if (errorType === 'content_policy_violation') {
                        errorMessage = '⚠️ 内容审核未通过：生成结果被拦截'
                    } else if (errorType) {
                        errorMessage = `FAL 错误: ${errorType}`
                    }
                } catch { }

                _ulogError(`[FAL Status] 422 错误: ${errorMessage}`)
                return {
                    status: 'COMPLETED',
                    completed: true,
                    failed: true,
                    error: errorMessage
                }
            }

            // 🔥 500 下游服务错误，标记为失败，避免无限重试
            if (resultResponse.status === 500) {
                // 尝试解析错误详情
                let errorDetail = '下游服务错误'
                try {
                    const errorJson = JSON.parse(errorText)
                    if (errorJson.detail?.[0]?.type === 'downstream_service_error') {
                        errorDetail = 'FAL 下游服务错误：上游模型处理失败'
                    }
                } catch { }

                _ulogError(`[FAL Status] 500 错误，标记任务为失败: ${errorDetail}`)
                return {
                    status: 'COMPLETED',
                    completed: true,
                    failed: true,
                    error: errorDetail
                }
            }

            // 其他错误，暂时返回进行中状态，下次轮询重试
            return {
                status: 'IN_PROGRESS',
                completed: false,
                failed: false
            }
        }
    }

    if (status === 'FAILED') {
        return {
            status: 'FAILED',
            completed: false,
            failed: true,
            error: data.error || '任务失败'
        }
    }

    return {
        status,
        completed: false,
        failed: false
    }
}

// ==================== Ark 视频任务 ====================

/**
 * 查询Ark视频任务状态
 * @param taskId Ark任务ID
 * @param apiKey ARK API Key
 */
export async function queryArkVideoStatus(taskId: string, apiKey: string, baseUrl?: string): Promise<{
    status: string
    completed: boolean
    failed: boolean
    resultUrl?: string
    error?: string
}> {
    if (!apiKey) {
        throw new Error('请配置火山引擎 API Key')
    }

    const effectiveBaseUrl = baseUrl || 'https://ark.cn-beijing.volces.com/api/v3'

    const response = await fetch(
        `${effectiveBaseUrl}/contents/generations/tasks/${taskId}`,
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        }
    )

    if (!response.ok) {
        return {
            status: 'unknown',
            completed: false,
            failed: false
        }
    }

    const data = await response.json()
    const status = data.status

    if (status === 'succeeded') {
        return {
            status: 'succeeded',
            completed: true,
            failed: false,
            resultUrl: data.content?.video_url
        }
    }

    if (status === 'failed') {
        const errorObj = data.error || {}
        let errorMessage = errorObj.message || '任务失败'

        // 友好的错误信息
        if (errorObj.code === 'OutputVideoSensitiveContentDetected') {
            errorMessage = '视频生成失败：内容审核未通过'
        } else if (errorObj.code === 'InputImageSensitiveContentDetected') {
            errorMessage = '视频生成失败：输入图片审核未通过'
        }

        return {
            status: 'failed',
            completed: false,
            failed: true,
            error: errorMessage
        }
    }

    return {
        status,
        completed: false,
        failed: false
    }
}

// ==================== KIE.ai 任务 ====================

const KIE_BASE_URL = 'https://api.kie.ai/api/v1'

/**
 * 提交 KIE.ai 任务
 * @param body 完整请求体（含 model + input）
 * @param apiKey KIE.ai API Key
 * @returns taskId
 */
export async function submitKieTask(body: Record<string, unknown>, apiKey: string): Promise<string> {
    if (!apiKey) {
        throw new Error('请配置 KIE.ai API Key')
    }

    const response = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    })

    const raw = await response.text()
    let data: { code?: number; msg?: string; data?: { taskId?: string } } = {}
    if (raw) {
        try {
            data = JSON.parse(raw)
        } catch {
            throw new Error(`KIE 提交失败: 响应不是有效 JSON (${response.status})`)
        }
    }

    if (!response.ok || data.code !== 200) {
        const msg = data.msg || `HTTP ${response.status}`
        throw new Error(`KIE 提交失败 (${response.status}): ${msg}`)
    }

    const taskId = data.data?.taskId
    if (!taskId) {
        throw new Error('KIE 未返回 taskId')
    }

    _ulogInfo(`[KIE] 任务已提交: ${taskId}`)
    return taskId
}

/**
 * 查询 KIE.ai 任务状态
 */
export async function queryKieStatus(taskId: string, apiKey: string): Promise<{
    status: string
    completed: boolean
    failed: boolean
    resultUrl?: string
    error?: string
}> {
    if (!apiKey) {
        throw new Error('请配置 KIE.ai API Key')
    }

    const url = `${KIE_BASE_URL}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    if (!response.ok) {
        // 404/500 等临时错误，交给轮询重试
        return { status: 'unknown', completed: false, failed: false }
    }

    const payload = await response.json() as {
        code?: number
        msg?: string
        data?: {
            state?: string
            resultJson?: string
            failCode?: string
            failMsg?: string
        }
    }

    const state = payload.data?.state || ''

    if (state === 'success') {
        let resultUrl: string | undefined
        const resultJson = payload.data?.resultJson
        if (resultJson) {
            try {
                const parsed = JSON.parse(resultJson) as { resultUrls?: unknown }
                if (Array.isArray(parsed.resultUrls) && typeof parsed.resultUrls[0] === 'string') {
                    resultUrl = parsed.resultUrls[0]
                }
            } catch {
                // fallthrough — treat as failed below
            }
        }
        if (!resultUrl) {
            return {
                status: 'success',
                completed: true,
                failed: true,
                error: 'KIE 任务完成但未返回结果 URL',
            }
        }
        return {
            status: 'success',
            completed: true,
            failed: false,
            resultUrl,
        }
    }

    if (state === 'fail') {
        const msg = payload.data?.failMsg || payload.data?.failCode || '任务失败'
        return {
            status: 'fail',
            completed: true,
            failed: true,
            error: `KIE: ${msg}`,
        }
    }

    // waiting / queuing / generating → pending
    return { status: state || 'pending', completed: false, failed: false }
}

// ==================== 通用接口 ====================

export type AsyncTaskProvider = 'fal' | 'ark' | 'modelark' | 'kie'
export type AsyncTaskType = 'video' | 'image' | 'tts' | 'lipsync'

/**
 * 统一查询任务状态
 * @param provider 服务提供商
 * @param taskId 任务ID
 * @param apiKey API Key
 * @param endpoint FAL端点（仅FAL需要）
 * @param baseUrl Ark 家族（ark / modelark）的基础 URL
 */
export async function queryAsyncTaskStatus(
    provider: AsyncTaskProvider,
    taskId: string,
    apiKey: string,
    endpoint?: string,
    baseUrl?: string
): Promise<{
    status: string
    completed: boolean
    failed: boolean
    resultUrl?: string
    error?: string
}> {
    if (provider === 'fal' && endpoint) {
        return queryFalStatus(endpoint, taskId, apiKey)
    } else if (provider === 'ark' || provider === 'modelark') {
        return queryArkVideoStatus(taskId, apiKey, baseUrl)
    } else if (provider === 'kie') {
        return queryKieStatus(taskId, apiKey)
    }

    return {
        status: 'unknown',
        completed: false,
        failed: false
    }
}
