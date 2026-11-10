import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import EdgeHandles from '.'

const HANDLE_PATTERN = /data-resize-handle="true"/g
const HANDLES_PER_BLOCK = 2

describe('EdgeHandles', () => {
  it('draws one resize handle per block edge', () => {
    const html = renderToStaticMarkup(<EdgeHandles />)

    expect(html.match(HANDLE_PATTERN)).toHaveLength(HANDLES_PER_BLOCK)
  })
})
