import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { isErrorResponse, requireProjectAuth } from '@/lib/api-auth'
import { executeProjectAgentOperationFromApi } from '@/lib/adapters/api/execute-project-agent-operation'

export const GET = apiHandler(async (
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; commandId: string }> },
) => {
  const { projectId, commandId } = await context.params
  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  const result = await executeProjectAgentOperationFromApi({
    request: _request,
    operationId: 'get_project_command',
    projectId,
    userId: authResult.session.user.id,
    input: { commandId },
    source: 'project-ui/api',
  })

  return NextResponse.json({
    ...(result && typeof result === 'object' && !Array.isArray(result) ? result : { command: null }),
  })
})
