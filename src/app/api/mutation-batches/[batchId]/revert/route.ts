import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { forbidden, notFound, requireUserAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { executeProjectAgentOperationFromApi } from '@/lib/adapters/api/execute-project-agent-operation'

export const POST = apiHandler(async (
  _request: NextRequest,
  context: { params: Promise<{ batchId: string }> },
) => {
  const { batchId } = await context.params
  const authResult = await requireUserAuth()
  if (authResult instanceof NextResponse) return authResult
  const { session } = authResult
  const resolvedBatchId = batchId.trim()
  if (!resolvedBatchId) return notFound('MutationBatch')

  const batch = await prisma.mutationBatch.findUnique({
    where: { id: resolvedBatchId },
    select: { id: true, projectId: true, userId: true, status: true },
  })
  if (!batch) return notFound('MutationBatch')
  if (batch.userId !== session.user.id) return forbidden('Forbidden')

  const result = await executeProjectAgentOperationFromApi({
    request: _request,
    operationId: 'revert_mutation_batch',
    projectId: batch.projectId,
    userId: session.user.id,
    input: {
      batchId: batch.id,
    },
    source: 'project-ui/api',
  })

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('REVERT_MUTATION_BATCH_RESULT_INVALID')
  }
  const record = result as Record<string, unknown>
  if (typeof record.ok !== 'boolean') {
    throw new Error('REVERT_MUTATION_BATCH_RESULT_INVALID')
  }
  if (typeof record.reverted !== 'number') {
    throw new Error('REVERT_MUTATION_BATCH_RESULT_INVALID')
  }

  return NextResponse.json({
    ok: record.ok,
    reverted: record.reverted,
    ...(record.ok ? {} : { error: record.error }),
  })
})
