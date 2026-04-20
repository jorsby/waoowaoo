import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { executeProjectAgentOperationFromApi } from '@/lib/adapters/api/execute-project-agent-operation'

export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

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

  const result = await executeProjectAgentOperationFromApi({
    request,
    operationId: 'dismiss_failed_tasks',
    projectId: 'system',
    userId: session.user.id,
    input: body,
    source: 'project-ui',
  })

  return NextResponse.json(result)
})

