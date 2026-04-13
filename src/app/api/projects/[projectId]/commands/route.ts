import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse, requireProjectAuth } from '@/lib/api-auth'
import { executeProjectCommand, listProjectCommands, syncProjectCommandStatus } from '@/lib/command-center/executor'

export const runtime = 'nodejs'

export const GET = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  const episodeId = request.nextUrl.searchParams.get('episodeId')?.trim() || null
  const limitRaw = request.nextUrl.searchParams.get('limit')?.trim() || ''
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 20
  const commands = await listProjectCommands({
    projectId,
    episodeId,
    limit: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 50)) : 20,
  })

  for (const command of commands) {
    if (command.status === 'running' || command.status === 'approved') {
      await syncProjectCommandStatus({ commandId: command.commandId })
    }
  }

  const refreshedCommands = await listProjectCommands({
    projectId,
    episodeId,
    limit: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 50)) : 20,
  })

  return NextResponse.json({
    commands: refreshedCommands,
  })
})

export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError('INVALID_PARAMS', {
      code: 'BODY_PARSE_FAILED',
      field: 'body',
    })
  }

  const result = await executeProjectCommand({
    request,
    projectId,
    userId: authResult.session.user.id,
    body,
  })

  if (result.requiresApproval) {
    return NextResponse.json({
      success: true,
      commandId: result.commandId,
      planId: result.planId,
      status: result.status,
      requiresApproval: true,
      summary: result.summary,
      steps: result.steps,
    })
  }

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
