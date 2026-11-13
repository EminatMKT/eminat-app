// The prefixes of a gitPush rule: pushing a protected branch to a known remote, a forcing or
// deleting flag right after `push` or after the remote, and rewriting the branch itself.
import { BRANCH, GIT, PUSH } from '../core'
import { DASH, REF_PREFIXES } from './constants/patterns'
import type { GuardRule, Pattern } from './types'

const refsOf = (branches: string[]): string[] => {
  const prefixed = REF_PREFIXES.flatMap((prefix) => branches.map((branch) => prefix + branch))
  const refs = [...branches, ...prefixed]

  return refs
}

const flagsOf = ({ forceFlags, shortForceLetters }: GuardRule): string[] => {
  const short = [...shortForceLetters].map((letter) => DASH + letter)
  const flags = [...forceFlags, ...short]

  return flags
}

const pushes = ({ codexRemotes, protectedBranches }: GuardRule, flags: string[]): Pattern[] => {
  const toBranch: Pattern = [GIT, PUSH, codexRemotes, refsOf(protectedBranches)]
  const forced: Pattern[] = [[GIT, PUSH, flags], [GIT, PUSH, codexRemotes, flags]]
  const patterns = [toBranch, ...forced]

  return patterns
}

/** Every argv prefix of a gitPush rule that execpolicy and Claude's Bash rules can match. */
export default function gitPush(rule: GuardRule): Pattern[] {
  const { protectedBranches, branchRewriteFlags } = rule
  const rewrite: Pattern = [GIT, BRANCH, branchRewriteFlags, protectedBranches]
  const patterns = [...pushes(rule, flagsOf(rule)), rewrite]

  return patterns
}
