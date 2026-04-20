import { NextRequest, NextResponse } from 'next/server'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { executeProjectAgentOperationFromApi } from '@/lib/adapters/api/execute-project-agent-operation'

/**
 * GET - 获取项目资产（角色 + 场景）
 * 🔥 V6.5: 为 useProjectAssets hook 提供统一的资产数据接口
 */
export const GET = apiHandler(async (
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
) => {
    const { projectId } = await context.params

    // 🔐 统一权限验证
    const authResult = await requireProjectAuthLight(projectId)
    if (isErrorResponse(authResult)) return authResult

    const result = await executeProjectAgentOperationFromApi({
      request,
      operationId: 'get_project_assets',
      projectId,
      userId: authResult.session.user.id,
      input: {},
      source: 'project-ui',
    })

    return NextResponse.json(result)
})
