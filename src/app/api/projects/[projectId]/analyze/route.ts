import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { executeProjectAgentOperationFromApi } from '@/lib/adapters/api/execute-project-agent-operation'

export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const body = await request.json().catch(() => ({}))

  const authResult = await requireProjectAuth(projectId, {
    include: { characters: true, locations: true },
  })
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const result = await executeProjectAgentOperationFromApi({
    request,
    operationId: 'analyze_novel',
    projectId,
    userId: session.user.id,
    input: body,
    source: 'project-ui/api',
  })

  return NextResponse.json(result)
})
