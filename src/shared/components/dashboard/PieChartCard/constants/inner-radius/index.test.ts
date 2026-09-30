import { expect, it } from 'vitest'
import INNER_RADIUS from './index'

it('stores the donut inner radius', () => {
  expect(INNER_RADIUS).toBe('55%')
})
