import { describe, expect, it } from 'vitest'
import * as printStylesModule from './index'

const { PRINT_STYLES } = printStylesModule
const STRING_TYPE = 'string'
const EMPTY_LENGTH = 0
const SINGLE_OCCURRENCE = 1
const FIRST_VALID_INDEX = 0
const STARTS_WITH_PAGINATION_RULE = false
const EXPECTED_EXPORT_NAMES = ['PRINT_STYLES']

// Golden copy of the two halves the module is specified to concatenate. Kept here, not
// imported from the module under test, so a regression that merges, drops or reorders either
// half still has an independent expectation to fail against.
const EXPECTED_DOCUMENT_STYLES = `
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff;
        color:#111; padding:40px 50px; font-size:13px; }
      @media print { .no-print { display:none !important; } body { padding:20px 30px; } }
    `
const EXPECTED_PAGINATION_STYLES =
  'td { overflow-wrap:anywhere; } table { table-layout:fixed; } thead { display:table-header-group; }'
const EXPECTED_PRINT_STYLES = EXPECTED_DOCUMENT_STYLES + EXPECTED_PAGINATION_STYLES
const SPACE_JOINED_HALVES = `${EXPECTED_DOCUMENT_STYLES} ${EXPECTED_PAGINATION_STYLES}`
const NEWLINE_JOINED_HALVES = `${EXPECTED_DOCUMENT_STYLES}\n${EXPECTED_PAGINATION_STYLES}`

const RESET_RULE = '* { margin:0; padding:0; box-sizing:border-box; }'
const FONT_FAMILY_FRAGMENT = "font-family: 'Segoe UI', Arial, sans-serif;"
const PRINT_HIDE_RULE =
  '@media print { .no-print { display:none !important; } body { padding:20px 30px; } }'
const OVERFLOW_WRAP_RULE = 'td { overflow-wrap:anywhere; }'
const TABLE_LAYOUT_RULE = 'table { table-layout:fixed; }'
const THEAD_DISPLAY_RULE = 'thead { display:table-header-group; }'
const PAGINATION_START_PREFIX = 'td {'

const BASE_FRAGMENTS = [RESET_RULE, FONT_FAMILY_FRAGMENT, PRINT_HIDE_RULE]
const PAGINATION_FRAGMENTS = [OVERFLOW_WRAP_RULE, TABLE_LAYOUT_RULE, THEAD_DISPLAY_RULE]

const EXPECTED_FRAGMENTS = [
  { label: 'universal box-sizing reset rule', fragment: RESET_RULE },
  { label: 'base font-family declaration', fragment: FONT_FAMILY_FRAGMENT },
  { label: 'base print-hide rule for .no-print', fragment: PRINT_HIDE_RULE },
  { label: 'pagination overflow-wrap rule', fragment: OVERFLOW_WRAP_RULE },
  { label: 'pagination table-layout rule', fragment: TABLE_LAYOUT_RULE },
  { label: 'pagination thead display rule', fragment: THEAD_DISPLAY_RULE },
]

const INCORRECT_CONCATENATIONS = [
  { label: 'the base styles alone (pagination half dropped)', value: EXPECTED_DOCUMENT_STYLES },
  { label: 'the pagination styles alone (base half dropped)', value: EXPECTED_PAGINATION_STYLES },
  { label: 'the halves joined by a space instead of being adjacent', value: SPACE_JOINED_HALVES },
  { label: 'the halves joined by a newline instead of being adjacent', value: NEWLINE_JOINED_HALVES },
]

const FRAGMENT_TEST_TITLE = 'contains the $label'
const SINGLE_OCCURRENCE_TEST_TITLE =
  'contains the $label exactly once (guards against duplication)'
const REGRESSION_TEST_TITLE = 'is not $label'
const SUITE_TITLE = 'PRINT_STYLES'

function indexOfEachFragment(source: string, fragments: string[]): number[] {
  return fragments.map((fragment) => source.indexOf(fragment))
}

function countOccurrences(source: string, fragment: string): number {
  return source.split(fragment).length - 1
}

describe(SUITE_TITLE, () => {
  it('is a non-empty string', () => {
    expect(typeof PRINT_STYLES).toBe(STRING_TYPE)
    expect(PRINT_STYLES.length).toBeGreaterThan(EMPTY_LENGTH)
  })

  it.each(EXPECTED_FRAGMENTS)(FRAGMENT_TEST_TITLE, ({ fragment }) => {
    expect(PRINT_STYLES).toContain(fragment)
  })

  it.each(EXPECTED_FRAGMENTS)(SINGLE_OCCURRENCE_TEST_TITLE, ({ fragment }) => {
    const occurrences = countOccurrences(PRINT_STYLES, fragment)

    expect(occurrences).toBe(SINGLE_OCCURRENCE)
  })

  it('places every base-document rule before every pagination rule', () => {
    const baseIndices = indexOfEachFragment(PRINT_STYLES, BASE_FRAGMENTS)
    const paginationIndices = indexOfEachFragment(PRINT_STYLES, PAGINATION_FRAGMENTS)

    expect(Math.min(...baseIndices)).toBeGreaterThanOrEqual(0)
    expect(Math.min(...paginationIndices)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...baseIndices)).toBeLessThan(Math.min(...paginationIndices))
  })

  it('does not start with a pagination rule (guards a reversed concatenation order)', () => {
    expect(PRINT_STYLES.trimStart().startsWith(PAGINATION_START_PREFIX)).toBe(false)
  })

  it('is exactly the base styles immediately followed by the pagination styles, byte for byte', () => {
    expect(PRINT_STYLES).toBe(EXPECTED_PRINT_STYLES)
  })

  it.each(INCORRECT_CONCATENATIONS)(REGRESSION_TEST_TITLE, ({ value }) => {
    expect(PRINT_STYLES).not.toBe(value)
  })

  it('exports PRINT_STYLES as its only named export', () => {
    expect(Object.keys(printStylesModule)).toEqual([SUITE_TITLE])
  })
})
