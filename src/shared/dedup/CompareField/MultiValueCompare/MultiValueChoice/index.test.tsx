import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MultiValueChoice from '.'

// Handlers are never attached under renderToStaticMarkup, so no click-simulation test here.
const TEXT = 'text-under-test'
const HINT = 'hint-under-test'
const LOSER_IDS = ['2']
const draw = (keptIds: string[], excludedIds: string[]) => renderToStaticMarkup(
  <MultiValueChoice
    text={TEXT}
    keptIds={keptIds}
    removableIds={LOSER_IDS}
    excludedIds={excludedIds}
    onToggle={vi.fn()}
    hintText={HINT}
  />,
)

describe('MultiValueChoice', () => {
  it('is checked when no id behind it has been excluded', () => {
    const html = draw([], [])
    expect(html).toContain('checked=""')
    expect(html).not.toContain('disabled=""')
  })

  it('is unchecked once its loser ids are all excluded', () => {
    expect(draw([], LOSER_IDS)).not.toContain('checked=""')
  })

  it('is disabled and says why when the winner already holds the value', () => {
    const html = draw(['1'], [])
    const id = html.match(/aria-describedby="([^"]+)"/)?.[1]
    expect(html).toContain('disabled=""')
    expect(id).toBeDefined()
    expect(html).toContain(`id="${id}"`)
    expect(html).toContain(HINT)
  })
})
