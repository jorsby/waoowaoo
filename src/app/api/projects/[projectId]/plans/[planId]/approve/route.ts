import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { isErrorResponse, requireProjectAuth } from '@/lib/api-auth'
import { approveProjectPlan } from '@/lib/command-center/executor'

export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string; planId: string }> },
) => {
  const { projectId, planId } = await context.params
  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  const result = await approveProjectPlan({
    request,
    userId: authResult.session.user.id,
    planId,
  })

  return NextResponse.json({
    success: true,
    async: true,
    commandId: result.commandId,
    planId: result.planId,
    taskId: result.linkedTaskId,
    runId: result.linkedRunId,
    status: result.status,
    summary: result.summary,
    steps: result.steps,
  })
})
