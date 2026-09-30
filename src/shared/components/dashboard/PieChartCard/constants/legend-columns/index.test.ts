import { expect, it } from 'vitest'
import LEGEND_COLUMNS from './index'

it('stores the legend grid template', () => {
  expect(LEGEND_COLUMNS).toContain('max-content')
})
