import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getProviderConfigMock = vi.hoisted(() => vi.fn())
const normalizeToBase64ForGenerationMock = vi.hoisted(() =>
  vi.fn(async (url: string) => (url.startsWith('data:') ? url : 'data:image/png;base64,UkVG')),
)

vi.mock('@/lib/api-config', () => ({
  getProviderConfig: getProviderConfigMock,
}))

vi.mock('@/lib/media/outbound-image', () => ({
  normalizeToBase64ForGeneration: normalizeToBase64ForGenerationMock,
}))

import { FalImageGenerator } from '@/lib/generators/fal'

const FAL_BASE = 'https://queue.fal.local'

type FetchCall = { url: string; init?: RequestInit }

function stubFetchSuccess(requestId: string): { calls: FetchCall[]; restore: () => void } {
  const calls: FetchCall[] = []
  const mock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    calls.push({ url, init })
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ request_id: requestId }),
      json: async () => ({ request_id: requestId }),
    } as unknown as Response
  })
  vi.stubGlobal('fetch', mock as unknown as typeof fetch)
  return { calls, restore: () => vi.unstubAllGlobals() }
}

describe('FalImageGenerator — GPT Image 2 branch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FAL_QUEUE_BASE_URL = FAL_BASE
    getProviderConfigMock.mockResolvedValue({ id: 'fal', apiKey: 'fal-key' })
  })

  afterEach(() => {
    delete process.env.FAL_QUEUE_BASE_URL
    vi.unstubAllGlobals()
  })

  it('text-to-image posts to openai/gpt-image-2 with image_size + quality (no aspect_ratio/resolution)', async () => {
    const { calls, restore } = stubFetchSuccess('req_gpt2_t2i')

    const generator = new FalImageGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      prompt: 'a red cube on a white table',
      options: {
        modelId: 'gpt-image-2',
        imageSize: 'square_hd',
        quality: 'low',
      },
    })

    expect(result.success).toBe(true)
    expect(result.externalId).toBe('FAL:IMAGE:openai/gpt-image-2:req_gpt2_t2i')

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(`${FAL_BASE}/openai/gpt-image-2`)
    expect((calls[0]?.init?.headers as Record<string, string>).Authorization).toBe('Key fal-key')

    const body = JSON.parse(calls[0]?.init?.body as string)
    expect(body.image_size).toBe('square_hd')
    expect(body.quality).toBe('low')
    expect(body.aspect_ratio).toBeUndefined()
    expect(body.resolution).toBeUndefined()
    expect(body.prompt).toBe('a red cube on a white table')

    restore()
  })

  it('image-to-image routes to openai/gpt-image-2/edit and attaches image_urls', async () => {
    const { calls, restore } = stubFetchSuccess('req_gpt2_edit')

    const generator = new FalImageGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      prompt: 'turn into watercolor',
      referenceImages: ['https://example.com/ref.png'],
      options: {
        modelId: 'gpt-image-2',
        imageSize: 'portrait_16_9',
        quality: 'high',
      },
    })

    expect(result.success).toBe(true)
    expect(result.externalId).toBe('FAL:IMAGE:openai/gpt-image-2/edit:req_gpt2_edit')

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(`${FAL_BASE}/openai/gpt-image-2/edit`)

    const body = JSON.parse(calls[0]?.init?.body as string)
    expect(body.image_urls).toEqual(['data:image/png;base64,UkVG'])
    expect(body.image_size).toBe('portrait_16_9')
    expect(body.quality).toBe('high')

    restore()
  })

  it('rejects invalid imageSize value before any network call', async () => {
    const { calls, restore } = stubFetchSuccess('should_not_be_called')

    const generator = new FalImageGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      prompt: 'anything',
      options: {
        modelId: 'gpt-image-2',
        imageSize: 'not_a_real_size',
      },
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('FAL_IMAGE_OPTION_VALUE_UNSUPPORTED: imageSize=not_a_real_size')
    expect(calls).toHaveLength(0)

    restore()
  })

  it('rejects invalid quality value before any network call', async () => {
    const { calls, restore } = stubFetchSuccess('should_not_be_called')

    const generator = new FalImageGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      prompt: 'anything',
      options: {
        modelId: 'gpt-image-2',
        quality: 'ultra',
      },
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('FAL_IMAGE_OPTION_VALUE_UNSUPPORTED: quality=ultra')
    expect(calls).toHaveLength(0)

    restore()
  })

  it('default banana branch still uses aspect_ratio/resolution (not image_size/quality)', async () => {
    const { calls, restore } = stubFetchSuccess('req_banana_baseline')

    const generator = new FalImageGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      prompt: 'baseline check',
      options: {
        aspectRatio: '16:9',
        resolution: '2K',
      },
    })

    expect(result.success).toBe(true)
    expect(calls[0]?.url).toBe(`${FAL_BASE}/fal-ai/nano-banana-pro`)

    const body = JSON.parse(calls[0]?.init?.body as string)
    expect(body.aspect_ratio).toBe('16:9')
    expect(body.resolution).toBe('2K')
    expect(body.image_size).toBeUndefined()
    expect(body.quality).toBeUndefined()

    restore()
  })
})
