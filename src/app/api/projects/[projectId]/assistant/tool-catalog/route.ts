import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { isErrorResponse, requireProjectAuth } from '@/lib/api-auth'
import { createProjectAgentOperationRegistry } from '@/lib/operations/registry'
import { buildProjectAgentToolCatalog } from '@/lib/project-agent/tool-catalog'

export const runtime = 'nodejs'

export const GET = apiHandler(async (
  request,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const authResult = await requireProjectAuth(projectId)
  if (isErrorResponse(authResult)) return authResult

  const operations = createProjectAgentOperationRegistry()
  const catalog = buildProjectAgentToolCatalog(
    operations,
    request.nextUrl.searchParams.get('locale') ?? undefined,
  )
  return NextResponse.json(catalog)
})
