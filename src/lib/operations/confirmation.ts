import type { OperationSideEffects } from '@/lib/operations/types'

export function shouldRequireAssistantConfirmation(sideEffects: OperationSideEffects | undefined): boolean {
  if (!sideEffects) return false
  if (sideEffects.requiresConfirmation !== undefined) return sideEffects.requiresConfirmation
  if (sideEffects.mode === 'query') return false
  if (sideEffects.billable) return true
  if (sideEffects.risk === 'high' || sideEffects.risk === 'medium') return true
  if (sideEffects.destructive || sideEffects.overwrite || sideEffects.bulk || sideEffects.longRunning) return true
  return false
}

export function isConfirmedOperationInput(input: unknown): boolean {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false
  return (input as { confirmed?: unknown }).confirmed === true
}

