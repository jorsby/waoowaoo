import type { UnifiedErrorCode } from './codes'
import type { Locale } from '@/i18n/routing'

export const USER_ERROR_MESSAGES_ZH: Record<UnifiedErrorCode, string> = {
  UNAUTHORIZED: '请先登录后再试。',
  FORBIDDEN: '你没有权限执行此操作。',
  NOT_FOUND: '没有找到对应的数据。',
  INVALID_PARAMS: '请求参数不正确，请检查后重试。',
  MISSING_CONFIG: '系统配置不完整，请联系管理员。',
  CONFLICT: '当前状态冲突，请刷新后重试。',
  TASK_NOT_READY: '任务还在处理中，请稍后。',
  NO_RESULT: '任务已完成，但没有可用结果。',
  RATE_LIMIT: '请求过于频繁，请稍后重试。',
  MODEL_NOT_OPEN: '模型权限未开通。请前往 https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement?LLM=%7B%7D&advancedActiveKey=model ，在模型管理页面点击右上角「一键开通所有模型」。',
  MODEL_NOT_REGISTERED: '模型尚未注册，请先完成模型配置后再试。',
  MODEL_NOT_CONFIGURED: '未配置可用模型，请先前往设置页面添加对应类型的模型后再试。',
  QUOTA_EXCEEDED: '额度已用尽，请稍后再试。',
  EXTERNAL_ERROR: '外部服务暂时不可用，请稍后重试。',
  NETWORK_ERROR: '网络异常，请稍后重试。',
  EMPTY_RESPONSE: '模型返回空响应（无有效内容），请稍后重试。',
  INSUFFICIENT_BALANCE: '余额不足，请先充值。',
  SENSITIVE_CONTENT: '内容可能涉及敏感信息，请修改后重试。',
  GENERATION_TIMEOUT: '生成超时，请重试。',
  VIDEO_API_FORMAT_UNSUPPORTED: '当前视频接口格式暂不支持。',
  GENERATION_FAILED: '生成失败，请稍后重试。',
  WATCHDOG_TIMEOUT: '任务执行超时，系统已终止该任务。',
  WORKER_EXECUTION_ERROR: '任务执行失败，请稍后重试。',
  INTERNAL_ERROR: '系统内部错误，请稍后重试。',
}

export const USER_ERROR_MESSAGES_EN: Record<UnifiedErrorCode, string> = {
  UNAUTHORIZED: 'Please log in and try again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  INVALID_PARAMS: 'The request parameters are invalid. Please check and try again.',
  MISSING_CONFIG: 'System configuration is incomplete. Please contact the administrator.',
  CONFLICT: 'The current state is out of sync. Please refresh and try again.',
  TASK_NOT_READY: 'The task is still processing. Please wait a moment.',
  NO_RESULT: 'The task completed, but no result is available.',
  RATE_LIMIT: 'Too many requests. Please try again later.',
  MODEL_NOT_OPEN: 'Model access is not activated. Go to https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement?LLM=%7B%7D&advancedActiveKey=model and click "Activate all models" in the top-right of the Model Management page.',
  MODEL_NOT_REGISTERED: 'The model is not registered. Please finish model configuration first and retry.',
  MODEL_NOT_CONFIGURED: 'No model is configured. Please add a model of the required type in Settings before retrying.',
  QUOTA_EXCEEDED: 'Quota exceeded. Please try again later.',
  EXTERNAL_ERROR: 'An external service is temporarily unavailable. Please try again later.',
  NETWORK_ERROR: 'Network error. Please try again later.',
  EMPTY_RESPONSE: 'The model returned an empty response (no meaningful content). Please retry.',
  INSUFFICIENT_BALANCE: 'Insufficient balance. Please top up first.',
  SENSITIVE_CONTENT: 'The content may contain sensitive material. Please modify and retry.',
  GENERATION_TIMEOUT: 'Generation timed out. Please retry.',
  VIDEO_API_FORMAT_UNSUPPORTED: 'The current video API format is not supported.',
  GENERATION_FAILED: 'Generation failed. Please try again later.',
  WATCHDOG_TIMEOUT: 'The task timed out and was terminated by the system.',
  WORKER_EXECUTION_ERROR: 'The task failed to execute. Please try again later.',
  INTERNAL_ERROR: 'Internal server error. Please try again later.',
}

export function getUserMessageByCode(code: UnifiedErrorCode, locale: Locale = 'zh') {
  const table = locale === 'en' ? USER_ERROR_MESSAGES_EN : USER_ERROR_MESSAGES_ZH
  return table[code]
}
