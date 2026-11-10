// Whether a path falls under a file rule: on or inside a protected path (or on a folder that
// holds one), or matching the rule's `pathPattern`. A committedFiles rule protects only the
// files that already exist in HEAD, which the adapter hands over as `context.committed`.
import { isAbsolute, relative, resolve } from 'node:path'
import {
  COMMITTED_FILES,
  GUARDRAIL_FILES,
  NONE,
  NOTHING,
  PARENT,
  SLASH,
} from './constants'
import { LEADING_DOT_SLASH } from './constants/patterns'
import textHit from './text-hit'
import type { Context, PathSource, Rule } from './types'

const GUARDED_BY_KIND: Record<string, PathSource> = {
  [GUARDRAIL_FILES]: (rule) => rule.paths,
  [COMMITTED_FILES]: (_rule, context) => context.committed ?? NONE,
}

const guardedPaths = (rule: Rule, context: Context): string[] =>
  GUARDED_BY_KIND[rule.kind]?.(rule, context) ?? NONE

const under = (path: string, folder: string): boolean => path.startsWith(folder + SLASH)

const inside = (rel: string, guarded: string): boolean =>
  rel === guarded || under(rel, guarded) || !rel || under(guarded, rel)

const relativeTo = ({ root, cwd }: Context, target: string): string => {
  const rel = relative(root, resolve(cwd, target))

  return rel.replace(LEADING_DOT_SLASH, NOTHING)
}

const insideGuarded = (target: string, context: Context, rule: Rule): boolean => {
  const rel = relativeTo(context, target)

  if (rel.startsWith(PARENT) || isAbsolute(rel)) return false

  return guardedPaths(rule, context).some((path) => inside(rel, path))
}

/** Whether a path, as written in a command or handed to an edit tool, falls under the rule. */
export default function touchesGuarded(target: string, context: Context, rule: Rule): boolean {
  const { pathPattern } = rule
  const patterned = Boolean(pathPattern) && textHit(pathPattern, target)

  return patterned || insideGuarded(target, context, rule)
}
