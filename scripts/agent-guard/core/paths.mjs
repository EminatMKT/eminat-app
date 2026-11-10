// Says whether a path (as written in a command, or handed to an edit tool) falls under one
// file rule: on or inside one of the paths the rule protects (or on a folder that contains
// one of them), or matching the rule's `pathPattern` (e.g. `.env.prod*`). A guardrailFiles
// rule names its paths in rules.json; a committedFiles rule protects only the files under
// its folders that already exist in HEAD, which the adapter hands over as `context.committed`.
import { isAbsolute, relative, resolve } from 'node:path'

const PARENT = '..'
const FLAGS = 'i'
const NONE = []

const GUARDED_BY_KIND = {
  guardrailFiles: (rule) => rule.paths,
  committedFiles: (_rule, context) => context.committed ?? NONE,
}

const guardedPaths = (rule, context) => GUARDED_BY_KIND[rule.kind]?.(rule, context) ?? NONE

const inside = (rel, guarded) =>
  rel === guarded || rel.startsWith(`${guarded}/`) || rel === '' || guarded.startsWith(`${rel}/`)

const patternHit = (rule, target) => Boolean(rule.pathPattern) && new RegExp(rule.pathPattern, FLAGS).test(target)

const insideGuarded = (target, context, rule) => {
  const rel = relative(context.root, resolve(context.cwd, target)).replace(/^\.\//, '')
  if (rel.startsWith(PARENT) || isAbsolute(rel)) return false
  return guardedPaths(rule, context).some((path) => inside(rel, path))
}

export default function touchesGuarded(target, context, rule) {
  return patternHit(rule, target) || insideGuarded(target, context, rule)
}
