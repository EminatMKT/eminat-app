// The Codex execpolicy rules file: a header saying what only the hook can match, then one prefix
// rule per rule prefix and package runner, with the rule's decision and block message.
import { NEWLINE, NOTHING } from '../core'
import { SOURCE } from './constants'
import { COMMENT, RULE_BREAK } from './constants/execpolicy'
import header from './execpolicy-header.json' with { type: 'json' }
import limits from './limits'
import patterns from './patterns'
import withRunners from './runners'
import starlark from './starlark'
import type { GuardRule } from './types'

const comment = (line: string): string => (COMMENT + line).trimEnd()

const entries = (rule: GuardRule): string[] => {
  const spelled = patterns(rule).flatMap(withRunners)
  const texts = spelled.map((pattern) => starlark(rule, pattern))

  return texts
}

const headerLines = (): string[] => {
  const { generated, cannotExpress, promptNote } = header
  const lines = [...generated, NOTHING, ...cannotExpress, ...limits(), ...promptNote]

  return lines.map(comment)
}

/** The whole rules file, ending in a newline. */
export default function execpolicy(): string {
  const blocks = [headerLines().join(NEWLINE), ...SOURCE.rules.flatMap(entries)]
  const text = blocks.join(RULE_BREAK) + NEWLINE

  return text
}
