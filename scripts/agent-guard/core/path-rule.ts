import { NONE, PATH_KINDS, RULES } from './constants'
import touchesGuarded from './paths'
import type { Context, Rule } from './types'

const guardsPaths = ({ kind, pathPattern }: Rule): boolean =>
  PATH_KINDS.includes(kind) || Boolean(pathPattern)

/** The first file rule one of the paths (handed to an edit tool) falls under, or undefined. */
export default function pathRule(paths: string[] | undefined, context: Context): Rule | undefined {
  const touched = (rule: Rule): boolean =>
    guardsPaths(rule) && (paths ?? NONE).some((path) => touchesGuarded(path, context, rule))

  return RULES.rules.find(touched)
}
