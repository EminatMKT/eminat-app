import { describe, expect, it } from 'vitest'
import { PRINT_STYLES } from './index'
import {
  PRINT_HIDE_RULE as BASE_PRINT_HIDE_RULE,
  OVERFLOW_WRAP_RULE as PAGINATION_OVERFLOW_RULE,
  FRAGMENT_TEST_TITLE,
} from './print-styles/fixtures'

const EXPECTED_FRAGMENTS = [
  { label: 'base font-family declaration', fragment: "font-family: 'Segoe UI', Arial, sans-serif;" },
  { label: 'base print-hide rule for .no-print', fragment: BASE_PRINT_HIDE_RULE },
  { label: 'pagination overflow-wrap rule', fragment: PAGINATION_OVERFLOW_RULE },
  { label: 'pagination table-layout rule', fragment: 'table { table-layout:fixed; }' },
  { label: 'pagination thead display rule', fragment: 'thead { display:table-header-group; }' },
]

const ORDERING_TEST_TITLE =
  'concatenates the base styles before the pagination styles, with both intact'
const SUITE_TITLE = 'PRINT_STYLES (barrel re-export)'

describe(SUITE_TITLE, () => {
  it.each(EXPECTED_FRAGMENTS)(FRAGMENT_TEST_TITLE, ({ fragment }) => {
    expect(PRINT_STYLES).toContain(fragment)
  })

  it(ORDERING_TEST_TITLE, () => {
    const baseIndex = PRINT_STYLES.indexOf(BASE_PRINT_HIDE_RULE)
    const paginationIndex = PRINT_STYLES.indexOf(PAGINATION_OVERFLOW_RULE)

    expect(baseIndex).not.toBe(-1)
    expect(paginationIndex).not.toBe(-1)
    expect(baseIndex).toBeLessThan(paginationIndex)
  })
})
