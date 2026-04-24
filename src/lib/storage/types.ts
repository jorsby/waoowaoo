export type StorageType = 'minio' | 'local' | 'cos'

export interface UploadObjectParams {
  key: string
  body: Buffer
  contentType?: string
}

export interface UploadObjectResult {
  key: string
}

export interface DeleteObjectsResult {
  success: number
  failed: number
}

export interface SignedUrlParams {
  key: string
  expiresInSeconds: number
}

export interface StorageProvider {
  readonly kind: StorageType
  uploadObject(params: UploadObjectParams): Promise<UploadObjectResult>
  deleteObject(key: string): Promise<void>
  deleteObjects(keys: string[]): Promise<DeleteObjectsResult>
  getSignedObjectUrl(params: SignedUrlParams): Promise<string>
  /**
   * 生成供外部 API（KIE、fal 等）拉取使用的绝对 URL。
   * 优先使用 MINIO_PUBLIC_ENDPOINT；未配置时回退到 getSignedObjectUrl。
   */
  getSignedPublicObjectUrl(params: SignedUrlParams): Promise<string>
  getObjectBuffer(key: string): Promise<Buffer>
  extractStorageKey(input: string | null | undefined): string | null
  toFetchableUrl(inputUrl: string): string
  generateUniqueKey(params: { prefix: string; ext: string }): string
}

export interface StorageFactoryOptions {
  storageType?: string
}
