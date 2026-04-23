export type AiModality = 'llm' | 'vision' | 'image' | 'video' | 'audio' | 'lipsync'
export type AiExecutionMode = 'sync' | 'async' | 'stream' | 'batch'

export type AiOptionValidationResult =
  | { ok: true }
  | { ok: false; reason: string }

export type AiOptionValidator = (value: unknown) => AiOptionValidationResult

export type AiOptionSchema = {
  allowedKeys: ReadonlySet<string>
  required?: readonly string[]
  conflicts?: ReadonlyArray<{ keys: readonly string[]; message: string }>
  validators: Readonly<Record<string, AiOptionValidator>>
}

export type AiModelVariantDescriptor = {
  modelKey: string
  providerKey: string
  providerId: string
  modelId: string
  modality: AiModality

  familyRef?: string

  display: {
    name: string
    sourceLabel: string
    label: string
  }

  execution: {
    mode: AiExecutionMode
    externalIdPrefix?: string
  }

  capabilities: Record<string, unknown>
  optionSchema: AiOptionSchema
  inputContracts?: Record<string, unknown>
}

export type AiResolvedMediaSelection = {
  provider: string
  modelId: string
  modelKey: string
  compatMediaTemplate?: {
    mode?: 'sync' | 'async'
  } | null
}

export interface AiMediaAdapter {
  readonly providerKey: string
  describeVariant(
    modality: Extract<AiModality, 'image' | 'video' | 'audio'>,
    selection: AiResolvedMediaSelection,
  ): AiModelVariantDescriptor
}
