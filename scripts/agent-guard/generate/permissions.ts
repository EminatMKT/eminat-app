// Claude Code permission rules from the rules file: forbidden prefixes are denied, prompt ones
// asked, each guarded path denies Edit and each `readPaths` glob (gitignore syntax) denies Read.
import { GUARDRAIL_FILES, NONE, SPACE } from '../core'
import { SOURCE } from './constants'
import {
  BASH_RULE,
  EDIT_RULES,
  FORBIDDEN,
  READ_RULE,
  RULE_TOKEN,
} from './constants/patterns'
import expand from './expand'
import fill from './fill'
import patterns from './patterns'
import type { GuardRule, Permissions } from './types'

const bashRule = (words: string[]): string => fill(BASH_RULE, [RULE_TOKEN, words.join(SPACE)])

const editRules = (path: string): string[] =>
  EDIT_RULES.map((form) => fill(form, [RULE_TOKEN, path]))

const readRule = (path: string): string => fill(READ_RULE, [RULE_TOKEN, path])

const readRules = (): string[] =>
  SOURCE.rules.flatMap(({ readPaths }) => readPaths ?? NONE).map(readRule)

const bashRules = (rules: GuardRule[]): string[] => {
  const words = rules.flatMap(patterns).flatMap(expand)

  return [...new Set(words.map(bashRule))]
}

const isForbidden = ({ codex }: GuardRule): boolean => codex === FORBIDDEN

const isAsked = (rule: GuardRule): boolean => !isForbidden(rule)

const guardedPaths = (): string[] => {
  const guarded = SOURCE.rules.filter(({ kind }) => kind === GUARDRAIL_FILES)

  return guarded.flatMap(({ paths }) => paths)
}

/** The deny and ask lists of the Claude Code project settings. */
export default function permissions(): Permissions {
  const denied = bashRules(SOURCE.rules.filter(isForbidden))
  const deny = [...denied, ...guardedPaths().flatMap(editRules), ...readRules()]
  const result = { deny, ask: bashRules(SOURCE.rules.filter(isAsked)) }

  return result
}
