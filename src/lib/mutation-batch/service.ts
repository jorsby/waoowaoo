import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export type MutationBatchStatus = 'active' | 'reverted' | 'failed'

export type MutationEntrySpec = {
  kind: string
  targetType: string
  targetId: string
  payload?: unknown
}

export async function createMutationBatch(params: {
  projectId: string
  userId: string
  source: string
  operationId?: string | null
  summary?: string | null
  entries: MutationEntrySpec[]
}) {
  return prisma.mutationBatch.create({
    data: {
      projectId: params.projectId,
      userId: params.userId,
      source: params.source,
      operationId: params.operationId ?? null,
      summary: params.summary ?? null,
      entries: {
        create: params.entries.map((entry) => ({
          kind: entry.kind,
          targetType: entry.targetType,
          targetId: entry.targetId,
          ...(entry.payload === undefined ? {} : { payload: entry.payload as Prisma.InputJsonValue }),
        })),
      },
    },
    include: {
      entries: true,
    },
  })
}

export async function listRecentMutationBatches(params: {
  projectId: string
  userId: string
  limit?: number
}) {
  const limit = Math.max(1, Math.min(20, params.limit ?? 10))
  return prisma.mutationBatch.findMany({
    where: {
      projectId: params.projectId,
      userId: params.userId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      entries: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}

export async function markMutationBatchReverted(params: {
  batchId: string
  status: MutationBatchStatus
  revertError?: string | null
}) {
  return prisma.mutationBatch.update({
    where: { id: params.batchId },
    data: {
      status: params.status,
      revertError: params.revertError ?? null,
      revertedAt: params.status === 'reverted' ? new Date() : null,
    },
  })
}
