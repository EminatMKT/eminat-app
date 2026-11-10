// Answers whether a git command is forbidden by a gitPush rule (push to a protected branch,
// force, history-rewriting or ref-deleting push, deleting or rewriting a protected branch)
// or a gitHooks rule (hooks set aside).
import parseGit from './git.mjs'

const PUSH = 'push'
const CONFIG = 'config'
const HEAD = 'HEAD'
const LONG = '--'
const BRANCH = 'branch'
// `+ref` forces the update and `:ref` deletes the remote ref.
const REWRITING = /^[+:]/

const destination = (refspec, branch) => {
  const target = refspec.replace(/^\+/, '').split(':').pop().replace(/^refs\/heads\//, '')
  return target === HEAD ? branch : target
}

const forced = (args, rule) =>
  args.some((arg) => rule.forceFlags.includes(arg.split('=')[0]) ||
    (!arg.startsWith(LONG) && /^-\w/.test(arg) && [...rule.shortForceLetters].some((l) => arg.includes(l))))

const toProtected = (args, rule, branch) => {
  const refspecs = args.filter((arg) => !arg.startsWith('-')).slice(1)
  const targets = refspecs.length ? refspecs.map((refspec) => destination(refspec, branch)) : [branch]
  return refspecs.some((refspec) => REWRITING.test(refspec)) || targets.some((t) => rule.protectedBranches.includes(t))
}

const pushHit = (git, rule, context) =>
  git.sub === PUSH && (forced(git.args, rule) || toProtected(git.args, rule, context.branch))

const branchHit = (git, rule) =>
  git.sub === BRANCH && git.args.some((arg) => rule.branchRewriteFlags.includes(arg)) &&
  git.args.some((arg) => rule.protectedBranches.includes(arg))

const hooksHit = (git, rule) => {
  const lowered = [...git.configs, ...(git.sub === CONFIG ? git.args : [])].map((word) => word.toLowerCase())
  const skips = rule.noVerify[git.sub] ?? []
  return lowered.some((word) => rule.configKeys.some((key) => word.startsWith(key))) || git.args.some((a) => skips.includes(a))
}

export default function matchGit(command, rule, context) {
  if (rule.kind === 'gitHooks' && command.env.some((name) => rule.envNames.includes(name))) return true
  if (!rule.programs.includes(command.words[0])) return false
  const git = parseGit(command.words)
  return rule.kind === 'gitPush' ? pushHit(git, rule, context) || branchHit(git, rule) : hooksHit(git, rule)
}
