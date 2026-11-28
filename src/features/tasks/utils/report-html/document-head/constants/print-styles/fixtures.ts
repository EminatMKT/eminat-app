export const PRINT_HIDE_RULE =
  '@media print { .no-print { display:none !important; } body { padding:20px 30px; } }'
export const OVERFLOW_WRAP_RULE = 'td { overflow-wrap:anywhere; }'
export const FRAGMENT_TEST_TITLE = 'contains the $label'

// Shared fragments both print-styles' own test and the document-head/constants barrel's test
// assert on, so neither re-types the value. FRAGMENT_TEST_TITLE is the same sharing for the
// `it.each` title both suites parameterize their per-fragment cases with.
