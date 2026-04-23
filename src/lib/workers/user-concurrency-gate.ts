import { withAiConcurrencyGate } from '@/lib/ai-exec/governance'

export async function withUserConcurrencyGate<T>(input: {
  scope: 'image' | 'video'
  userId: string
  limit: number
  run: () => Promise<T>
}): Promise<T> {
  return await withAiConcurrencyGate(input)
}
