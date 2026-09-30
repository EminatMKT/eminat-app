import { describe, expect, it } from 'vitest'
import textDef from './index'

describe('textDef', () => {
  it('filters text', () => {
    expect(textDef.key).toBe('text')
  })
})
