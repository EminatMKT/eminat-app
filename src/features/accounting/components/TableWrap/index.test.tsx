import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TableWrap from './index'

const draw = () => renderToStaticMarkup(<TableWrap><tbody><tr><td>Cell</td></tr></tbody></TableWrap>)

describe('TableWrap', () => {
  it('wraps children in a table without owning data states', () => {
    const html = draw()
    expect(html).toContain('<table')
    expect(html).toContain('<tbody>')
    expect(html).toContain('Cell')
  })
})
