import { describe, it, expect, vi } from 'vitest'
import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Frame from './index'

const VALUE = 'Alex +1'
const EMPTY = 'nothing-here'
const ROW = <li data-row="1" />

const combo = (open: boolean, shown: unknown[]) => ({
  root: createRef<HTMLDivElement>(),
  listId: 'list',
  open,
  shown,
  activeId: undefined,
  onOpen: vi.fn(),
  onType: vi.fn(),
  onKeyDown: vi.fn(),
})

const draw = (open: boolean, shown: unknown[]) =>
  renderToStaticMarkup(<Frame combo={combo(open, shown)} value={VALUE} empty={EMPTY} multiple>{ROW}</Frame>)

describe('Combobox Frame', () => {
  it('closed, it is only the box with its value: no list', () => {
    const html = draw(false, [])
    expect(html).toContain('role="combobox"')
    expect(html).toContain(`value="${VALUE}"`)
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('role="listbox"')
  })

  it('open, it shows the rows in a multiselectable list', () => {
    const html = draw(true, [1])
    expect(html).toContain('aria-multiselectable="true"')
    expect(html).toContain('data-row="1"')
    expect(html).not.toContain(EMPTY)
  })

  it('open with nothing to show, it says the empty message', () => {
    expect(draw(true, [])).toContain(EMPTY)
  })
})
