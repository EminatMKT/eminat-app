import { expect, it } from 'vitest'
import OUTER_RADIUS from './index'

it('stores the chart outer radius', () => {
  expect(OUTER_RADIUS).toBe('90%')
})
