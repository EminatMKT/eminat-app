// Answers whether a git command is forbidden by a gitPush rule (see push-hit) or by a
// gitHooks rule: hooks set aside through config, `--no-verify` or the environment.
import calls from './calls'
import {
  CONFIG,
  GIT_HOOKS,
  GIT_PUSH,
  NONE,
} from './constants'
import envHit from './env-hit'
import namesFlag from './names-flag'
import parseGit from './parse-git'
import pushHit from './push-hit'
import readsConfig from './reads-config'
import type {
  Command,
  Context,
  GitCommand,
  Rule,
} from './types'

const hooksHit = (git: GitCommand, rule: Rule): boolean => {
  const { configs, sub, args } = git
  const writes = sub === CONFIG && !readsConfig(git, rule)
  const relevantWords = writes ? [...configs, ...args] : configs
  const lowered = relevantWords.map((word) => word.toLowerCase())
  const skips = rule.noVerify[sub] ?? NONE
  const keyHit = lowered.some((word) => rule.configKeys.some((key) => word.startsWith(key)))

  return keyHit || args.some((arg) => namesFlag(arg, skips))
}

/** Whether a git command breaks a gitPush or a gitHooks rule. */
export default function matchGit(command: Command, rule: Rule, context: Context): boolean {
  if (rule.kind === GIT_HOOKS && envHit(command, rule)) return true

  if (!calls(command, rule)) return false

  const git = parseGit(command.words)
  const isPushRule = rule.kind === GIT_PUSH

  return isPushRule ? pushHit(git, rule, context.branch) : hooksHit(git, rule)
}
