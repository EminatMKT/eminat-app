import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import useConfirmation from './index'

let seen: ReturnType<typeof useConfirmation> | null = null

function Probe() {
  seen = useConfirmation()
  return null
}

describe('useConfirmation', () => {
  // Nothing landed yet, so nothing is said; `say` is how a write that landed is announced.
  it('starts with nothing to say and a way to say it', () => {
    renderToStaticMarkup(<Probe />)
    expect(seen?.said).toBeNull()
    expect(typeof seen?.say).toBe('function')
  })
})
