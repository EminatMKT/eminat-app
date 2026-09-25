import { it, expect } from 'vitest'
import SEPARATORS from './index'

it('names the two separators an amount is typed with, and every kind of blank', () => {
  expect([SEPARATORS.dot, SEPARATORS.comma]).toEqual(['.', ','])
  expect('1 250 000'.replace(SEPARATORS.blanks, '')).toBe('1250000')
})
