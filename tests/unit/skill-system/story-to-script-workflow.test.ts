import { describe, expect, it, vi } from 'vitest'
import { runStoryToScriptSkillWorkflow } from '@/lib/skill-system/executors/story-to-script/preset'

describe('story-to-script skill workflow', () => {
  it('retries retryable analysis skill failure up to 3 attempts', async () => {
    const actionCalls = new Map<string, number>()
    const characterMetas: Array<{ stepId: string; stepAttempt?: number }> = []
    const runStep = vi.fn(async (meta, _prompt, action: string) => {
      actionCalls.set(action, (actionCalls.get(action) || 0) + 1)

      if (action === 'analyze_characters') {
        characterMetas.push({ stepId: meta.stepId, stepAttempt: meta.stepAttempt })
        const count = actionCalls.get(action) || 0
        if (count < 3) {
          throw new TypeError('terminated')
        }
        return { text: JSON.stringify({ characters: [{ name: '甲', introduction: '人物介绍' }] }), reasoning: '' }
      }
      if (action === 'analyze_locations') {
        return { text: JSON.stringify({ locations: [{ name: '地点A' }] }), reasoning: '' }
      }
      if (action === 'analyze_props') {
        return { text: JSON.stringify({ props: [] }), reasoning: '' }
      }
      if (action === 'split_clips') {
        return {
          text: JSON.stringify([
            {
              start: '甲在门口',
              end: '乙回答',
              summary: '片段摘要',
              location: '地点A',
              characters: ['甲'],
            },
          ]),
          reasoning: '',
        }
      }
      return { text: JSON.stringify({ scenes: [{ id: 1 }] }), reasoning: '' }
    })

    const result = await runStoryToScriptSkillWorkflow({
      locale: 'zh',
      content: '甲在门口。乙回答。',
      baseCharacters: [],
      baseLocations: [],
      baseCharacterIntroductions: [],
      runStep,
    })

    expect(result.summary.clipCount).toBe(1)
    expect(actionCalls.get('analyze_characters')).toBe(3)
    expect(runStep.mock.calls[0]?.[1]).toContain('# Analyze Characters')
    expect(characterMetas).toEqual([
      { stepId: 'analyze_characters', stepAttempt: undefined },
      { stepId: 'analyze_characters', stepAttempt: 2 },
      { stepId: 'analyze_characters', stepAttempt: 3 },
    ])
  })

  it('enforces topology: split waits for analyses, screenplay waits for split', async () => {
    const actionOrder: string[] = []
    const runStep = vi.fn(async (_meta, _prompt, action: string) => {
      actionOrder.push(action)
      if (action === 'analyze_characters') {
        return { text: JSON.stringify({ characters: [{ name: '甲', introduction: '人物介绍' }] }), reasoning: '' }
      }
      if (action === 'analyze_locations') {
        return { text: JSON.stringify({ locations: [{ name: '地点A' }] }), reasoning: '' }
      }
      if (action === 'analyze_props') {
        return { text: JSON.stringify({ props: [] }), reasoning: '' }
      }
      if (action === 'split_clips') {
        return {
          text: JSON.stringify([
            {
              start: '甲在门口',
              end: '乙回答',
              summary: '片段摘要',
              location: '地点A',
              characters: ['甲'],
            },
          ]),
          reasoning: '',
        }
      }
      if (action === 'screenplay_conversion') {
        return { text: JSON.stringify({ scenes: [{ scene_number: 1 }] }), reasoning: '' }
      }
      throw new Error(`unexpected action: ${action}`)
    })

    const result = await runStoryToScriptSkillWorkflow({
      locale: 'zh',
      content: '甲在门口。乙回答。',
      baseCharacters: [],
      baseLocations: [],
      baseCharacterIntroductions: [],
      runStep,
    })

    expect(result.summary.clipCount).toBe(1)
    const splitIndex = actionOrder.indexOf('split_clips')
    const screenplayIndex = actionOrder.indexOf('screenplay_conversion')
    expect(splitIndex).toBeGreaterThan(actionOrder.indexOf('analyze_characters'))
    expect(splitIndex).toBeGreaterThan(actionOrder.indexOf('analyze_locations'))
    expect(splitIndex).toBeGreaterThan(actionOrder.indexOf('analyze_props'))
    expect(screenplayIndex).toBeGreaterThan(splitIndex)
  })
})
