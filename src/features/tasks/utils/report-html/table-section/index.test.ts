import { describe, expect, it } from 'vitest'
import tableSection from './index'

const HEADERS = '<th>Task</th>'
const ROWS = '<tr><td>Build</td></tr>'
const HEADER_MARKER = `<thead><tr style="background:#f8f8fa">${HEADERS}</tr></thead>`
const ROW_MARKER = `<tbody>${ROWS}</tbody>`

describe('tableSection', () => {
  it('wraps the supplied headers and rows in the report table structure', () => {
    const html = tableSection(HEADERS, ROWS)
    expect(html).toContain(HEADER_MARKER)
    expect(html).toContain(ROW_MARKER)
  })
})
