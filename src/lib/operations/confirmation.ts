import type { OperationConfirmation } from '@/lib/operations/types'

export function shouldRequireAssistantConfirmation(confirmation: OperationConfirmation | undefined): boolean {
  return confirmation?.required === true
}

export function isConfirmedOperationInput(input: unknown): boolean {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false
  return (input as { confirmed?: unknown }).confirmed === true
}
