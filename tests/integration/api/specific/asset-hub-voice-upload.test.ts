import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.hoisted(() => ({
  requireUserAuth: vi.fn(async () => ({
    session: { user: { id: 'user-1' } },
  })),
  isErrorResponse: vi.fn((value: unknown) => value instanceof Response),
}))

const prismaMock = vi.hoisted(() => ({
  globalAssetFolder: {
    findUnique: vi.fn(async () => null),
  },
  globalVoice: {
    create: vi.fn(async () => ({
      id: 'voice-1',
      userId: 'user-1',
      folderId: null,
      name: 'My Voice',
      description: null,
      voiceType: 'uploaded',
      customVoiceUrl: 'voices/user-1/voice.mp3',
      customVoiceMediaId: 'media-1',
    })),
  },
}))

const storageMock = vi.hoisted(() => ({
  generateUniqueKey: vi.fn(() => 'voices/user-1/voice.mp3'),
  uploadObject: vi.fn(async () => 'voices/user-1/voice.mp3'),
}))

const mediaServiceMock = vi.hoisted(() => ({
  resolveMediaRefFromLegacyValue: vi.fn(async () => ({ id: 'media-1' })),
}))

const mediaAttachMock = vi.hoisted(() => ({
  attachMediaFieldsToGlobalVoice: vi.fn(async (voice: unknown) => voice),
}))

vi.mock('@/lib/api-auth', () => authMock)
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/storage', () => storageMock)
vi.mock('@/lib/media/service', () => mediaServiceMock)
vi.mock('@/lib/media/attach', () => mediaAttachMock)

describe('api specific - asset hub voice upload', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('uploads audio and creates a global voice record', async () => {
    const form = new FormData()
    form.set('name', '  My Voice  ')
    form.set('file', new Blob(['abc'], { type: 'audio/mpeg' }), 'sample.mp3')

    const req = new NextRequest(new URL('http://localhost:3000/api/asset-hub/voices/upload'), {
      method: 'POST',
      body: form,
    })

    const mod = await import('@/app/api/asset-hub/voices/upload/route')
    const res = await mod.POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)

    expect(storageMock.generateUniqueKey).toHaveBeenCalledTimes(1)
    expect(storageMock.uploadObject).toHaveBeenCalledTimes(1)
    expect(prismaMock.globalVoice.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user-1',
        name: 'My Voice',
        voiceType: 'uploaded',
        customVoiceUrl: 'voices/user-1/voice.mp3',
        customVoiceMediaId: 'media-1',
      }),
    }))

    const payload = await res.json() as { success?: boolean; voice?: { id?: string } }
    expect(payload.success).toBe(true)
    expect(payload.voice?.id).toBe('voice-1')
  })
})
