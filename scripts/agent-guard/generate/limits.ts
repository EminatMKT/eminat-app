// The header lines naming the rules execpolicy covers only in part or not at all, by what only
// the hook can match; read from the rules file, so the list follows it.
import { PATH_KINDS } from '../core'
import { SOURCE } from './constants'
import { LIST_SEPARATOR } from './constants/execpolicy'
import header from './execpolicy-header.json' with { type: 'json' }
import patterns from './patterns'
import type { Category, GuardRule } from './types'

const hookOnly = (rule: GuardRule): boolean => !patterns(rule).length

const byRegex = ({ pattern, exceptPattern }: GuardRule): boolean =>
  Boolean(pattern ?? exceptPattern)

const byPath = ({ kind, pathPattern }: GuardRule): boolean =>
  PATH_KINDS.includes(kind) || Boolean(pathPattern)

const byEnv = ({ envNames }: GuardRule): boolean => Boolean(envNames?.length)

const CATEGORIES: Category[] = [
  { label: header.limits.hookOnly, keep: hookOnly },
  { label: header.limits.regex, keep: byRegex },
  { label: header.limits.paths, keep: byPath },
  { label: header.limits.env, keep: byEnv },
]

const line = ({ label, keep }: Category): string => {
  const ids = SOURCE.rules.filter(keep).map(({ id }) => id)
  const text = label + ids.join(LIST_SEPARATOR)

  return text
}

/** One header line per category, listing the ids of the rules in it. */
export default function limits(): string[] {
  const lines = CATEGORIES.map(line)

  return lines
}
