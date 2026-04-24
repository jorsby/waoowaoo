import { describe, expect, it } from 'vitest'
import { formatDefaultProjectTimestamp } from '@/lib/projects/default-name'

describe('default project name timestamp', () => {
  it('formats month-day and hour-minute without year', () => {
    expect(formatDefaultProjectTimestamp(new Date(2026, 2, 29, 18, 56, 42))).toBe('03-29 18:56')
  })
})
