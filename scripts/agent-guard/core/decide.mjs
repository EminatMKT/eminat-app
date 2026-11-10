// The single decision point of the agent guard. Every adapter (Claude Code, Codex) hands
// it what the agent is about to do and relays the verdict; no rule lives anywhere else.
//   request: { command?: string, paths?: string[] }
//   context: { cwd, root, branch, committed } — `committed`: repo-relative files that exist in
//   HEAD under the folders of the committedFiles rules (looked up by the adapter).
import rules from '../rules.json' with { type: 'json' }
import matchCommand from './match-command.mjs'
import matchGit from './match-git.mjs'
import matchGuardrail from './match-guardrail.mjs'
import message from './message.mjs'
import touchesGuarded from './paths.mjs'
import segments from './segments.mjs'

const BY_KIND = { gitPush: matchGit, gitHooks: matchGit, guardrailFiles: matchGuardrail, committedFiles: matchGuardrail }
const PATH_KINDS = ['guardrailFiles', 'committedFiles']
const LINE_KIND = 'linePattern'
const { xargsProbes } = rules.parsing
const ALLOW = { decision: 'allow', rule: null, message: '' }

const plain = (rule, command, context) => (BY_KIND[rule.kind] ?? matchCommand)(command, rule, context)

// A command run through xargs gets its real arguments at run time, so it is also tried with
// each worst-case probe (`main`, `--force`, a guarded file...) appended.
const probed = (rule, command, context) =>
  Boolean(command.xargs) && xargsProbes.some((probe) => plain(rule, { ...command, words: [...command.words, probe] }, context))

const forbids = (rule, command, context) => plain(rule, command, context) || probed(rule, command, context)

// A linePattern rule reads the whole line, pipes included (e.g. `printenv | grep TOKEN`).
const lineHit = (rule, line) => rule.kind === LINE_KIND && new RegExp(rule.pattern, 'i').test(line)

// An alias whose value calls a guarded program is refused even when the value alone is
// harmless (`alias gp='git push'`): the arguments it will get later are not on this line.
const aliasHit = (rule, command) => Boolean(command.alias) && rule.programs.includes(command.words[0])

const commandRule = (line, context) => {
  const commands = segments(line).filter((command) => command.words.length || command.env.length)
  const direct = rules.rules.find((rule) => lineHit(rule, line) || commands.some((command) => forbids(rule, command, context)))
  return direct ?? rules.rules.find((rule) => commands.some((command) => aliasHit(rule, command)))
}

const guardsPaths = (rule) => PATH_KINDS.includes(rule.kind) || Boolean(rule.pathPattern)

const pathRule = (paths, context) =>
  rules.rules.find((rule) => guardsPaths(rule) && (paths ?? []).some((path) => touchesGuarded(path, context, rule)))

export default function decide(request, context) {
  const rule = commandRule(request.command ?? '', context) ?? pathRule(request.paths, context)
  return rule ? { decision: 'block', rule: rule.id, message: message(rule) } : ALLOW
}
