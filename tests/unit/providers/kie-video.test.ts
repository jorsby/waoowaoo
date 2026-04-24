import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getProviderConfigMock = vi.hoisted(() => vi.fn())
const submitKieTaskMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api-config', () => ({
  getProviderConfig: getProviderConfigMock,
}))

vi.mock('@/lib/async-submit', () => ({
  submitKieTask: submitKieTaskMock,
}))

import { KieVideoGenerator } from '@/lib/generators/kie'

describe('KieVideoGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProviderConfigMock.mockResolvedValue({ id: 'kie', apiKey: 'kie-key' })
    submitKieTaskMock.mockResolvedValue('kie-task-1')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Seedance: passes first_frame_url when no referenceImageUrls (mutual exclusivity)', async () => {
    const generator = new KieVideoGenerator()

    const result = await generator.generate({
      userId: 'user-1',
      imageUrl: 'https://example.com/first.png',
      prompt: 'pan across the valley',
      options: {
        modelId: 'bytedance/seedance-2-fast',
        resolution: '720p',
        aspectRatio: '16:9',
        duration: 5,
      },
    })

    expect(result.success).toBe(true)
    expect(result.externalId).toBe('KIE:VIDEO:bytedance/seedance-2-fast:kie-task-1')

    expect(submitKieTaskMock).toHaveBeenCalledTimes(1)
    const [body, apiKey] = submitKieTaskMock.mock.calls[0] as [Record<string, unknown>, string]
    expect(apiKey).toBe('kie-key')
    expect(body.model).toBe('bytedance/seedance-2-fast')
    const input = body.input as Record<string, unknown>
    expect(input.first_frame_url).toBe('https://example.com/first.png')
    expect(input.reference_image_urls).toBeUndefined()
    expect(input.resolution).toBe('720p')
    expect(input.aspect_ratio).toBe('16:9')
    expect(input.duration).toBe(5)
  })

  it('Seedance: uses reference_image_urls (max 9) and ignores first/last frame when refs present', async () => {
    const generator = new KieVideoGenerator()
    const refs = Array.from({ length: 12 }, (_, i) => `https://example.com/ref-${i}.png`)

    const result = await generator.generate({
      userId: 'user-1',
      imageUrl: 'https://example.com/first.png',
      prompt: 'multi-reference shot',
      options: {
        modelId: 'bytedance/seedance-2',
        referenceImageUrls: refs,
      },
    })

    expect(result.success).toBe(true)

    const [body] = submitKieTaskMock.mock.calls[0] as [Record<string, unknown>]
    const input = body.input as Record<string, unknown>
    expect(Array.isArray(input.reference_image_urls)).toBe(true)
    expect((input.reference_image_urls as string[]).length).toBe(9)
    expect(input.first_frame_url).toBeUndefined()
    expect(input.last_frame_url).toBeUndefined()
  })

  it('Grok Imagine: builds image_urls array (max 7, deduped) and omits seedance-only fields', async () => {
    const generator = new KieVideoGenerator()

    const result = await generator.generate({
      userId: 'user-1',
      imageUrl: 'https://example.com/a.png',
      prompt: 'dreamlike cinematic',
      options: {
        modelId: 'grok-imagine/image-to-video',
        referenceImageUrls: [
          'https://example.com/a.png', // duplicate of imageUrl, should dedupe
          'https://example.com/b.png',
          'https://example.com/c.png',
        ],
        duration: 6,
        resolution: '720p',
      },
    })

    expect(result.success).toBe(true)

    const [body] = submitKieTaskMock.mock.calls[0] as [Record<string, unknown>]
    const input = body.input as Record<string, unknown>
    expect(input.image_urls).toEqual([
      'https://example.com/a.png',
      'https://example.com/b.png',
      'https://example.com/c.png',
    ])
    expect(input.first_frame_url).toBeUndefined()
    expect(input.reference_image_urls).toBeUndefined()
    // Grok expects duration as string
    expect(input.duration).toBe('6')
  })

  it('returns failure when modelId is not an allowed KIE model', async () => {
    const generator = new KieVideoGenerator()

    const result = await generator.generate({
      userId: 'user-1',
      imageUrl: 'https://example.com/a.png',
      options: { modelId: 'not-a-real-model' },
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('KIE_VIDEO_MODEL_UNSUPPORTED')
    expect(result.error).toContain('not-a-real-model')
    expect(submitKieTaskMock).not.toHaveBeenCalled()
  }, 10000)

  it('returns failure when options contain an unknown key', async () => {
    const generator = new KieVideoGenerator()

    const result = await generator.generate({
      userId: 'user-1',
      imageUrl: 'https://example.com/a.png',
      options: {
        modelId: 'bytedance/seedance-2-fast',
        mysteryFlag: 'boom',
      } as Record<string, unknown>,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('KIE_VIDEO_OPTION_UNSUPPORTED')
    expect(result.error).toContain('mysteryFlag')
    expect(submitKieTaskMock).not.toHaveBeenCalled()
  }, 10000)
})
