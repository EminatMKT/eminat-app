import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MultiCombobox from './index'

const OPTIONS = [{ id: 'a', label: 'Alex Bravo' }, { id: 'b', label: 'Beth Cruz' }]
const SUMMARY = 'Alex Bravo +1'
const SEARCH = 'Find people'
const empty = vi.fn(() => null)

const draw = () => renderToStaticMarkup(
  <MultiCombobox options={OPTIONS} selected={['a']} onToggle={vi.fn()} display={SUMMARY}
    searchPlaceholder={SEARCH} empty={empty} />)

describe('MultiCombobox', () => {
  it('closed, the box reads the summary and takes no typing', () => {
    const html = draw()
    expect(html).toContain('role="combobox"')
    expect(html).toContain(`value="${SUMMARY}"`)
    expect(html).toContain('readonly=""')
    expect(html).toContain('aria-expanded="false"')
  })

  it('hands the empty state the search and a way to clear it', () => {
    draw()
    expect(empty).toHaveBeenCalledWith(expect.objectContaining({ query: '' }))
  })
})
