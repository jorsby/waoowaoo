import { describe, expect, it } from 'vitest'
import { composeSkillPrompt } from '@/../skills/project-workflow/_shared/prompt-runtime'

describe('project-workflow prompt runtime', () => {
  it('analysis execution prompts render only the template body without injecting SKILL.md instructions', () => {
    const prompt = composeSkillPrompt({
      skillId: 'plan-storyboard-phase1',
      locale: 'zh',
      replacements: {
        characters_lib_name: '张三',
        locations_lib_name: '办公室',
        characters_introduction: '张三：主角',
        characters_appearance_list: '张三-常服',
        characters_full_description: '张三，青年男性。',
        props_description: '公文包',
        clip_json: '{"id":"clip-1"}',
        clip_content: '【剧本格式】\n{"scenes":[]}',
      },
    })

    expect(prompt).toContain('你是专业的分镜规划师。')
    expect(prompt).toContain('角色资产库：张三')
    expect(prompt).toContain('Clip信息：')
    expect(prompt).toContain('{"id":"clip-1"}')
    expect(prompt).not.toContain('[Skill Instructions]')
    expect(prompt).not.toContain('[Execution Template]')
    expect(prompt).not.toContain('## Purpose')
    expect(prompt).not.toContain('## Use This Skill When')
  })
})
