import { describe, it, expect } from 'vitest'
import requestToken from './index'

describe('requestToken', () => {
  it('lets the answer of the only request in flight through', () => {
    const token = requestToken()
    expect(token.claim()()).toBe(true)
  })

  // A view change starts a second read while the first is still travelling. Whichever answers
  // last must not win: only the request nobody replaced may touch the screen.
  it('discards the answer of a request a newer one replaced', () => {
    const token = requestToken()
    const first = token.claim()
    const second = token.claim()
    expect(first()).toBe(false)
    expect(second()).toBe(true)
  })

  it('discards every answer still in flight once it is cancelled', () => {
    const token = requestToken()
    const flying = token.claim()
    token.cancel()
    expect(flying()).toBe(false)
  })

  it('keeps two tokens from speaking for each other', () => {
    const mine = requestToken()
    const yours = requestToken()
    const flying = mine.claim()
    yours.claim()
    expect(flying()).toBe(true)
  })
})
