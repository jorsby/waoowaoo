type ConcurrencyScope = 'image' | 'video'

interface GateState {
  active: number
  waitingResolvers: Array<() => void>
}

const gateStateMap = new Map<string, GateState>()

function getGateState(key: string): GateState {
  const existing = gateStateMap.get(key)
  if (existing) return existing
  const created: GateState = { active: 0, waitingResolvers: [] }
  gateStateMap.set(key, created)
  return created
}

function cleanupGateStateIfIdle(key: string) {
  const state = gateStateMap.get(key)
  if (!state) return
  if (state.active === 0 && state.waitingResolvers.length === 0) {
    gateStateMap.delete(key)
  }
}

async function acquireConcurrencySlot(key: string, limit: number): Promise<void> {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(`WORKFLOW_CONCURRENCY_INVALID: ${limit}`)
  }

  const state = getGateState(key)
  if (state.active < limit) {
    state.active += 1
    return
  }

  await new Promise<void>((resolve) => {
    state.waitingResolvers.push(resolve)
  })
}

function releaseConcurrencySlot(key: string) {
  const state = gateStateMap.get(key)
  if (!state) return

  if (state.waitingResolvers.length > 0) {
    const nextResolver = state.waitingResolvers.shift()
    nextResolver?.()
    return
  }

  state.active = Math.max(0, state.active - 1)
  cleanupGateStateIfIdle(key)
}

export function computeRetryDelay(input: {
  attempt: number
  kind: 'llm' | 'vision' | 'worker'
}): number {
  if (input.kind === 'vision') {
    return Math.min(1000 * Math.pow(2, input.attempt - 1), 5000)
  }
  if (input.kind === 'worker') {
    return Math.min(1000 * Math.pow(2, input.attempt - 1), 5000)
  }
  return Math.min(1000 * Math.pow(2, input.attempt - 1), 5000)
}

export async function waitForRetryDelay(input: {
  attempt: number
  kind: 'llm' | 'vision' | 'worker'
}): Promise<void> {
  const delayMs = computeRetryDelay(input)
  await new Promise((resolve) => setTimeout(resolve, delayMs))
}

export async function withAiConcurrencyGate<T>(input: {
  scope: ConcurrencyScope
  userId: string
  limit: number
  run: () => Promise<T>
}): Promise<T> {
  const key = `${input.scope}:${input.userId}`
  await acquireConcurrencySlot(key, input.limit)
  try {
    return await input.run()
  } finally {
    releaseConcurrencySlot(key)
  }
}
