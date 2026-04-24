import { beforeEach, describe, expect, it, vi } from 'vitest'

const storageMocks = vi.hoisted(() => ({
  getSignedUrl: vi.fn((key: string) => `/signed/${key}`),
  toFetchableUrl: vi.fn((value: string) => (
    value.startsWith('/') ? `http://localhost:3000${value}` : value
  )),
  extractStorageKey: vi.fn((input: string | null | undefined): string | null => {
    if (!input) return null
    if (input.startsWith('images/')) return input
    return null
  }),
  getSignedPublicObjectUrl: vi.fn(
    async (key: string, _expires: number) => `https://public.example/${key}?sig=abc`,
  ),
}))

vi.mock('@/lib/storage', () => storageMocks)
vi.mock('@/lib/media/service', () => ({
  resolveStorageKeyFromMediaValue: vi.fn(async () => null),
}))

import { normalizeReferenceImagesForGeneration } from '@/lib/media/outbound-image'

describe('normalizeReferenceImagesForGeneration model routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storageMocks.extractStorageKey.mockImplementation((input) => {
      if (!input) return null
      if (input.startsWith('images/')) return input
      return null
    })
    storageMocks.getSignedPublicObjectUrl.mockImplementation(
      async (key: string) => `https://public.example/${key}?sig=abc`,
    )

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'image/png' }),
      arrayBuffer: async () => Uint8Array.from([0xde, 0xad, 0xbe, 0xef]).buffer,
    } as unknown as Response))
    vi.stubGlobal('fetch', fetchMock)
  })

  it('KIE model: storage-key inputs resolve to absolute public URLs', async () => {
    const out = await normalizeReferenceImagesForGeneration(
      ['images/a.png', 'images/b.png'],
      { modelKey: 'kie::bytedance/seedance-2' },
    )

    expect(out).toEqual([
      'https://public.example/images/a.png?sig=abc',
      'https://public.example/images/b.png?sig=abc',
    ])
    expect(storageMocks.getSignedPublicObjectUrl).toHaveBeenCalledTimes(2)
  })

  it('KIE model: already-absolute URLs pass through unchanged when no storage key is extractable', async () => {
    const out = await normalizeReferenceImagesForGeneration(
      ['https://external.example/already.png'],
      { modelKey: 'kie::grok-imagine/image-to-video' },
    )

    expect(out).toEqual(['https://external.example/already.png'])
    expect(storageMocks.getSignedPublicObjectUrl).not.toHaveBeenCalled()
  })

  it('non-KIE model: reference images flow through base64 normalization (data: URIs)', async () => {
    const out = await normalizeReferenceImagesForGeneration(
      ['images/a.png'],
      { modelKey: 'fal::nano-banana-pro' },
    )

    expect(out).toHaveLength(1)
    expect(out[0]).toMatch(/^data:image\/png;base64,/)
    expect(storageMocks.getSignedPublicObjectUrl).not.toHaveBeenCalled()
  })

  it('missing modelKey falls back to base64 normalization (preserves legacy behavior)', async () => {
    const out = await normalizeReferenceImagesForGeneration(['images/a.png'], {})

    expect(out).toHaveLength(1)
    expect(out[0]).toMatch(/^data:image\/png;base64,/)
    expect(storageMocks.getSignedPublicObjectUrl).not.toHaveBeenCalled()
  })
})
