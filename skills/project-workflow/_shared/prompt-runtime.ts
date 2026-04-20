import type { WorkflowSkillId } from '@/lib/skill-system/types'
import { buildAiPrompt, getAiPromptTemplate, resolveAiPromptIdFromWorkflowSkillId } from '@/lib/ai-prompts'

export type SkillLocale = 'zh' | 'en'

export function applyTemplate(template: string, replacements: Record<string, string>): string {
  let next = template
  for (const [key, value] of Object.entries(replacements)) {
    next = next.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return next
}

export function readSkillPromptTemplate(skillId: WorkflowSkillId, locale: SkillLocale): string {
  return getAiPromptTemplate(resolveAiPromptIdFromWorkflowSkillId(skillId), locale).trim()
}

export function composeSkillPrompt(params: {
  skillId: WorkflowSkillId
  locale: SkillLocale
  replacements: Record<string, string>
}): string {
  return buildAiPrompt({
    promptId: resolveAiPromptIdFromWorkflowSkillId(params.skillId),
    locale: params.locale,
    variables: params.replacements,
  })
}
