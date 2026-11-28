import { describe, expect, it } from 'vitest'
import documentHead from './index'

const TITLE = 'Report — Ada'
const CSS_MARKER = 'td { overflow-wrap:anywhere; } table { table-layout:fixed; }'
const TITLE_MARKER = `<title>${TITLE}</title>`
const BODY_MARKER = '<body>'

describe('documentHead', () => {
  it('starts the document with its title and print pagination CSS', () => {
    const html = documentHead(TITLE)
    expect(html).toContain(TITLE_MARKER)
    expect(html).toContain(CSS_MARKER)
    expect(html).toContain(BODY_MARKER)
  })
})
