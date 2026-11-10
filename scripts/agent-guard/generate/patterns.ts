// The argv prefixes of a rule, the part of it execpolicy and Claude's Bash rules can express:
// its own `codexPrefixes` when it has them, otherwise what its kind spells out as a prefix.
import { GIT_HOOKS, GIT_PUSH } from '../core'
import { KINDS, NO_PATTERNS } from './constants/patterns'
import gitHooks from './git-hooks'
import gitPush from './git-push'
import type { Builder, GuardRule, Pattern } from './types'

const fromPrefixes: Builder = ({ programs, prefixes }) =>
  prefixes.map((prefix) => [programs, ...prefix])

const fromWords: Builder = ({ programs, tokens, denySubcommands }) =>
  [[programs, tokens ?? denySubcommands]]

const BUILDERS: Record<string, Builder> = {
  [KINDS.prefix]: fromPrefixes,
  [KINDS.withPattern]: fromPrefixes,
  [KINDS.anyToken]: fromWords,
  [KINDS.programExcept]: fromWords,
  [GIT_PUSH]: gitPush,
  [GIT_HOOKS]: gitHooks,
}

/** The argv prefixes of a rule; a rule matched only by regex, path or context has none. */
export default function patterns(rule: GuardRule): Pattern[] {
  const build = BUILDERS[rule.kind]
  const found = rule.codexPrefixes ?? build?.(rule) ?? NO_PATTERNS

  return found
}
