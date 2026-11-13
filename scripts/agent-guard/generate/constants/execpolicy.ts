// How a Codex execpolicy prefix rule is spelled in Starlark, one field per line; the header
// prose lives in `execpolicy-header.json`.
const RULE_NAME = 'prefix_rule'
const OPEN_PAREN = '('

export const RULE_OPEN = RULE_NAME + OPEN_PAREN
export const FIELD_BREAK = '\n    '
export const FIELD_END = ','
export const RULE_CLOSE = ',\n)'
export const RULE_BREAK = '\n\n'
export const FIELDS = {
  pattern: 'pattern = ',
  decision: 'decision = ',
  justification: 'justification = ',
}
export const LIST_OPEN = '['
export const LIST_CLOSE = ']'
export const LIST_SEPARATOR = ', '
export const COMMENT = '# '
export const SINGLE = 1
