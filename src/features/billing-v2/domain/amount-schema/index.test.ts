import { expect, it } from 'vitest'
import billingAmount from './index'

const EXACT = ['0', '0.00', '7.5', '1.2300', '0007.50', '999999999999.99']
const REFUSED = [
  '-0.004', '0.004', '1.005', '-1.00', '-0', '-0.00', '0.001',
  'NaN', 'Infinity', '-Infinity',
  '1000000000000.00', '1.', '.5', '', ' 1.00', '+1.00', '1e3', '1,00',
]

it('accepts every decimal string that is exactly a whole number of cents', () => {
  for (const value of EXACT) expect(billingAmount.parse(value)).toBe(value)
})

it('refuses sub-cent, negative, nonfinite and out-of-range text before any rounding', () => {
  for (const value of REFUSED) expect(billingAmount.safeParse(value).success).toBe(false)
})

it('never lets a rejected sub-cent value come back as a valid zero', () => {
  const rounded = billingAmount.safeParse('-0.004')
  expect(rounded.success).toBe(false)
  expect(rounded.data).toBeUndefined()
})

it('refuses JS numbers, which cannot hold every cent exactly', () => {
  for (const value of [0, 1.5, NaN, Infinity, -Infinity]) {
    expect(billingAmount.safeParse(value).success).toBe(false)
  }
})

it('keeps an unknown amount and an explicit zero apart', () => {
  expect(billingAmount.parse(null)).toBeNull()
  expect(billingAmount.parse('0')).toBe('0')
  expect(billingAmount.safeParse(undefined).success).toBe(false)
})
