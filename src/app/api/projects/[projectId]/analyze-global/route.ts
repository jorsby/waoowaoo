import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { executeProjectAgentOperationFromApi } from '@/lib/adapters/api/execute-project-agent-operation'

/**
 * 全局资产分析（任务化）
 */
export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult
  const body = await request.json().catch(() => ({}))

  const result = await executeProjectAgentOperationFromApi({
    request,
    operationId: 'analyze_global',
    projectId,
    userId: session.user.id,
    input: body,
    source: 'project-ui/api',
  })

  return NextResponse.json(result)
})
