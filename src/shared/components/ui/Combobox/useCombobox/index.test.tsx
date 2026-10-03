import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import useCombobox from './index'

const PEOPLE = [{ id: 'a', label: 'Ana Bravo' }, { id: 'b', label: 'Beto Cruz' }]
const byLabel = (person: typeof PEOPLE[number]) => person.label
const seen: Array<ReturnType<typeof useCombobox<typeof PEOPLE[number]>>> = []

type ProbeProps = { query: string }

// Keeps what the hook decided on its first render, so it is read without a DOM.
function Probe({ query }: ProbeProps) {
  const config = {
    options: PEOPLE,
    query,
    onType: vi.fn(),
    onPick: vi.fn(),
    multiple: true,
    text: byLabel,
  }
  seen.push(useCombobox(config))
  return null
}

const draw = (query: string) => {
  renderToStaticMarkup(<Probe query={query} />)
  return seen[seen.length - 1]
}

describe('useCombobox', () => {
  it('starts closed with nothing highlighted', () => {
    const combo = draw('')
    expect(combo.open).toBe(false)
    expect(combo.activeId).toBeUndefined()
    expect(combo.shown).toEqual(PEOPLE)
  })

  it('filters object options by the text the caller reads', () => {
    expect(draw('cruz').shown).toEqual([PEOPLE[1]])
  })
})
