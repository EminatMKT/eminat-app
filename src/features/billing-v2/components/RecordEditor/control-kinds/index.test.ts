import { describe, it, expect } from 'vitest'
import CONTROL from './index'

describe('CONTROL', () => {
  it('names every control a billing field can be edited with', () => {
    expect(Object.keys(CONTROL)).toEqual(['text', 'date', 'time', 'select', 'textarea', 'toggle'])
  })

  // The renderer compares a spec against these members. If a value ever stopped matching its
  // key, a field would ask for a control nobody draws and the row would come out empty.
  it('keeps every value equal to its key', () => {
    Object.entries(CONTROL).forEach(([key, value]) => expect(value).toBe(key))
  })
})
