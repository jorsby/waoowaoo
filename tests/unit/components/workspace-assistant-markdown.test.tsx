import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MarkdownTextPart } from '@/features/project-workspace/components/workspace-assistant/MarkdownTextPart'

describe('workspace assistant markdown', () => {
  it('parses gfm pipe tables into table markup', () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownTextPart, {
        type: 'text',
        text: '| Name | Value |\n| --- | --- |\n| Foo | Bar |',
        status: { type: 'complete' },
      }),
    )

    expect(html).toContain('<table')
    expect(html).toContain('<th')
    expect(html).toContain('<td')
    expect(html).toContain('Foo')
    expect(html).toContain('Bar')
  })
})
