import { expect, it } from 'vitest'
import EMPTY_CHART_TEXT from './index'

it('stores the empty chart copy', () => {
  expect(EMPTY_CHART_TEXT).toBe('No chart data to show yet.')
})
