import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { isErrorResponse, requireProjectAuth } from '@/lib/api-auth'
import { listProjectCommands, syncProjectCommandStatus } from '@/lib/command-center/executor'

export const GET = apiHandler(async (
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; commandId: string }> },
) => {
  const { projectId, commandId } = await context.params
  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  await syncProjectCommandStatus({ commandId })
  const commands = await listProjectCommands({
    projectId,
    limit: 50,
  })
  const command = commands.find((item) => item.commandId === commandId) || null

  return NextResponse.json({
    command,
  })
})
