// Whether a git command pushes to a protected branch, forces, rewrites or deletes a remote
// ref (`+ref` forces the update, `:ref` deletes it), or deletes or renames a protected branch.
import {
  BRANCH,
  HEAD,
  NOTHING,
  PUSH,
  REF_SEPARATOR,
} from './constants'
import {
  FORCE_MARK,
  HEADS_PREFIX,
  REWRITING,
  SHORT_FLAG,
} from './constants/patterns'
import namesFlag from './names-flag'
import refspecs from './refspecs'
import type { GitCommand, Rule } from './types'

const destination = (refspec: string, branch: string): string => {
  const unforced = refspec.replace(FORCE_MARK, NOTHING)
  const target = unforced.split(REF_SEPARATOR).pop().replace(HEADS_PREFIX, NOTHING)

  return target === HEAD ? branch : target
}

const shortForced = (arg: string, letters: string): boolean =>
  SHORT_FLAG.test(arg) && [...letters].some((letter) => arg.includes(letter))

const forced = (args: string[], { forceFlags, shortForceLetters }: Rule): boolean =>
  args.some((arg) => namesFlag(arg, forceFlags) || shortForced(arg, shortForceLetters))

const toProtected = (args: string[], { protectedBranches }: Rule, branch: string): boolean => {
  const specs = refspecs(args)
  const toTarget = (spec: string): string => destination(spec, branch)
  const targets = specs.length ? specs.map(toTarget) : [branch]
  const rewrites = specs.some((spec) => REWRITING.test(spec))

  return rewrites || targets.some((target) => protectedBranches.includes(target))
}

const rewritesBranch = ({ sub, args }: GitCommand, rule: Rule): boolean => {
  const flagged = args.some((arg) => rule.branchRewriteFlags.includes(arg))

  return sub === BRANCH && flagged && args.some((arg) => rule.protectedBranches.includes(arg))
}

/** Whether a git command breaks a gitPush rule, given the branch checked out. */
export default function pushHit(git: GitCommand, rule: Rule, branch: string): boolean {
  const { sub, args } = git
  const pushes = sub === PUSH && (forced(args, rule) || toProtected(args, rule, branch))

  return pushes || rewritesBranch(git, rule)
}
