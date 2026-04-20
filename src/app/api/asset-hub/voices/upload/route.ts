import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { executeProjectAgentOperationFromApi } from '@/lib/adapters/api/execute-project-agent-operation'

/**
 * POST /api/asset-hub/voices/upload
 * 上传音频文件到音色库
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const result = await executeProjectAgentOperationFromApi({
    request,
    operationId: 'asset_hub_upload_voice',
    projectId: 'global-asset-hub',
    userId: session.user.id,
    input: {},
    source: 'asset-hub',
  })

  return NextResponse.json(result)
})
