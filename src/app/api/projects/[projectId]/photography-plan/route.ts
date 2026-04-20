import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { executeProjectAgentOperationFromApi } from '@/lib/adapters/api/execute-project-agent-operation'

/**
 * PUT /api/projects/[projectId]/photography-plan
 * 更新分镜组的摄影方案
 */
export const PUT = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) => {
  const { projectId } = await context.params

  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError('INVALID_PARAMS', {
      code: 'BODY_PARSE_FAILED',
      field: 'body',
      message: 'request body must be valid JSON',
    })
  }

  const payload = typeof body === 'object' && body && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {}

  const result = await executeProjectAgentOperationFromApi({
    request,
    operationId: 'update_storyboard_photography_plan',
    projectId,
    userId: authResult.session.user.id,
    input: {
      storyboardId: payload.storyboardId,
      photographyPlan: payload.photographyPlan,
    },
    source: 'project-ui',
  })

  return NextResponse.json(result)
})
