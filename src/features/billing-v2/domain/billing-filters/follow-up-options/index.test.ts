import { describe, expect, it } from 'vitest'
import followUpOptions from './index'

describe('follow-up filter options', () => {
  it('keeps the stored boolean choices in order', () => {
    expect(followUpOptions.values).toEqual([String(true), String(false)])
  })
})
