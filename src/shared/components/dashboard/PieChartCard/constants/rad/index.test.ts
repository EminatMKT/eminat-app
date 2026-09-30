import { expect, it } from 'vitest'
import RAD from './index'

it('stores the pie-angle conversion factor', () => {
  expect(RAD).toBe(Math.PI / 180)
})
