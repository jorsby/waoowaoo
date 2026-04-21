import { beforeEach, describe, expect, it, vi } from 'vitest'

const aiMock = vi.hoisted(() => ({
  generateText: vi.fn(async () => ({ text: '- user wants the current status\n- approval is still pending' })),
}))

vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai')
  return {
    ...actual,
    generateText: aiMock.generateText,
  }
})

import {
  compressMessages,
  isConversationSummaryMessage,
  shouldCompressMessages,
} from '@/lib/project-agent/message-compression'

describe('project agent message compression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shouldCompressMessages -> returns false for short conversations', () => {
    expect(shouldCompressMessages([
      {
        id: 'u1',
        role: 'user',
        parts: [{ type: 'text', text: 'hello' }],
      },
    ])).toBe(false)
  })

  it('shouldCompressMessages -> returns true when message count exceeds threshold', () => {
    const messages = Array.from({ length: 51 }, (_value, index) => ({
      id: `m${index}`,
      role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
      parts: [{ type: 'text' as const, text: `message-${index}` }],
    }))

    expect(shouldCompressMessages(messages)).toBe(true)
  })

  it('compressMessages -> replaces older history with a hidden summary and keeps recent turns', async () => {
    const messages = Array.from({ length: 52 }, (_value, index) => ({
      id: `m${index}`,
      role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
      parts: [{ type: 'text' as const, text: `message-${index}` }],
    }))

    const result = await compressMessages({
      messages,
      locale: 'en',
      model: {} as never,
    })

    expect(aiMock.generateText).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(21)
    expect(isConversationSummaryMessage(result[0]!)).toBe(true)
    expect(result[0]?.role).toBe('system')
    expect(result[0]?.parts).toEqual([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Conversation summary for earlier turns'),
      }),
    ])
    expect(result.slice(1).map((message) => message.id)).toEqual(messages.slice(-20).map((message) => message.id))
  })
})
