export type WorkflowPackageId = 'story-to-script' | 'script-to-storyboard'

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function resolveWorkflowPackageIdFromCommandInput(input: unknown): WorkflowPackageId | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const record = input as Record<string, unknown>
  const workflowId = normalizeString(record.workflowId)
  if (workflowId === 'story-to-script' || workflowId === 'script-to-storyboard') return workflowId
  return null
}

