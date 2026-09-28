import { it, expect } from 'vitest'
import SEPARATORS from './index'

it('names the two separators an amount is typed with, and every kind of blank', () => {
  expect([SEPARATORS.dot, SEPARATORS.comma]).toEqual(['.', ','])
  expect('1 250 000'.replace(SEPARATORS.blanks, '')).toBe('1250000')
})

it('names the currency mark only at either end of the figure', () => {
  expect(['$150', '150USD', '1$50'].map((typed) => typed.replace(SEPARATORS.currency, ''))).toEqual(['150', '150', '1$50'])
})
