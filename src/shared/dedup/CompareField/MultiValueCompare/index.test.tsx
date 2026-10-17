import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MultiValueCompare from '.'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const ROWS = [
  { text: '555-1', keptIds: [], removableIds: ['2'] },
  { text: '555-2', keptIds: [], removableIds: ['3'] },
]
const draw = (rows = ROWS, excludedIds: string[] = []) => renderToStaticMarkup(
  <MultiValueCompare labelKey="dedup.merge" rows={rows} excludedIds={excludedIds} onToggle={vi.fn()} />,
)
const count = (html: string, needle: string) => html.split(needle).length - 1

describe('MultiValueCompare', () => {
  it('starts with every value checked, so touching nothing loses nothing', () => {
    expect(count(draw(), 'checked=""')).toBe(2)
  })

  it('unchecks a value once its ids are excluded', () => {
    expect(count(draw(ROWS, ['2']), 'checked=""')).toBe(1)
  })

  it('keeps the winner’s own value checked, disabled, and says why', () => {
    const html = draw([{ text: '555-1', keptIds: ['1'], removableIds: ['2'] }], ['2'])
    expect(html).toContain('checked=""')
    expect(html).toContain('disabled=""')
    expect(html).toContain('dedup.keptOnWinner')
  })

  it('names the group of checkboxes with the field label', () => {
    expect(draw()).toMatch(/<legend[^>]*>dedup\.merge<\/legend>/)
  })
})
