import { expect, it } from 'vitest'
import LEGEND_STYLE from './index'

it('stores the typed legend grid style', () => {
  expect(LEGEND_STYLE['--legend-columns']).toContain('max-content')
})
