import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CLOSED from '../closed'
import useComboState from './index'

const seen: Array<ReturnType<typeof useComboState>> = []

function Probe() {
  seen.push(useComboState())
  return null
}

describe('useComboState', () => {
  it('starts closed, with a root to watch and an id for the list', () => {
    renderToStaticMarkup(<Probe />)
    const [first] = seen
    expect(first.state).toEqual(CLOSED)
    expect(first.root.current).toBeNull()
    expect(first.listId).toBeTruthy()
  })
})
