import { describe, expect, it } from 'vitest'
import endMinutesOf from '.'

const END_OF_DAY = '24:00'
const AFTER_END_OF_DAY = '24:01'
const ORDINARY_END = '23:30'

describe('endMinutesOf', () => {
  it('parses midnight only as the end of a day', () => {
    expect(endMinutesOf(END_OF_DAY)).toBe(1440)
    expect(endMinutesOf(AFTER_END_OF_DAY)).toBeNull()
    expect(endMinutesOf(ORDINARY_END)).toBe(1410)
  })
})
