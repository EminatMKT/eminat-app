// One execpolicy prefix rule in Starlark: the pattern (a one-word union collapses to its word),
// the rule's Codex decision and its block message as justification. A JSON string is Starlark.
import { message } from '../core'
import {
  FIELD_BREAK,
  FIELD_END,
  FIELDS,
  LIST_CLOSE,
  LIST_OPEN,
  LIST_SEPARATOR,
  RULE_CLOSE,
  RULE_OPEN,
  SINGLE,
} from './constants/execpolicy'
import type { Element, GuardRule, Pattern } from './types'

const quote = (text: string): string => JSON.stringify(text)

const list = (elements: Element[]): string =>
  LIST_OPEN + elements.map(spell).join(LIST_SEPARATOR) + LIST_CLOSE

const spell = (element: Element): string => {
  const words = [element].flat()
  const lone = words.length === SINGLE
  const spelled = lone ? quote(words.join()) : list(words)

  return spelled
}

const fieldsOf = (rule: GuardRule, pattern: Pattern): string[] => {
  const { codex } = rule
  const fields = [
    FIELDS.pattern + list(pattern),
    FIELDS.decision + quote(codex),
    FIELDS.justification + quote(message(rule)),
  ]

  return fields
}

/** The prefix rule of one pattern of a rule, one field per line. */
export default function starlark(rule: GuardRule, pattern: Pattern): string {
  const fields = fieldsOf(rule, pattern).join(FIELD_END + FIELD_BREAK)
  const text = RULE_OPEN + FIELD_BREAK + fields + RULE_CLOSE

  return text
}
