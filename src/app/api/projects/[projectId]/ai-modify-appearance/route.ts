import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { executeProjectAgentOperationFromApi } from '@/lib/adapters/api/execute-project-agent-operation'

export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const body = await request.json().catch(() => ({}))
  const characterId = typeof body?.characterId === 'string' ? body.characterId.trim() : ''
  const appearanceId = typeof body?.appearanceId === 'string' ? body.appearanceId.trim() : ''
  const currentDescription = typeof body?.currentDescription === 'string' ? body.currentDescription.trim() : ''
  const modifyInstruction = typeof body?.modifyInstruction === 'string' ? body.modifyInstruction.trim() : ''

  if (!characterId || !appearanceId || !currentDescription || !modifyInstruction) {
    throw new ApiError('INVALID_PARAMS')
  }

  const result = await executeProjectAgentOperationFromApi({
    request,
    operationId: 'ai_modify_appearance',
    projectId,
    userId: session.user.id,
    input: body,
    source: 'project-ui/api',
  })

  return NextResponse.json(result)
})
