// Whether one simple command is forbidden by one rule. A command run through xargs gets its
// real arguments at run time, so it is also tried with each worst-case probe appended.
import {
  COMMITTED_FILES,
  DOCS_CURRENT,
  GIT_HOOKS,
  GIT_PUSH,
  GUARDRAIL_FILES,
  RULES,
} from './constants'
import matchCommand from './match-command'
import matchDocs from './match-docs'
import matchGit from './match-git'
import matchGuardrail from './match-guardrail'
import type {
  Command,
  Context,
  Matcher,
  Rule,
} from './types'

const { xargsProbes } = RULES.parsing

const BY_KIND: Record<string, Matcher> = {
  [GIT_PUSH]: matchGit,
  [GIT_HOOKS]: matchGit,
  [GUARDRAIL_FILES]: matchGuardrail,
  [COMMITTED_FILES]: matchGuardrail,
  [DOCS_CURRENT]: matchDocs,
}

const plain = (rule: Rule, command: Command, context: Context): boolean =>
  (BY_KIND[rule.kind] ?? matchCommand)(command, rule, context)

const withProbe = (command: Command, probe: string): Command => ({
  ...command,
  words: [...command.words, probe],
})

const probed = (rule: Rule, command: Command, context: Context): boolean => {
  const tryProbe = (probe: string): boolean => plain(rule, withProbe(command, probe), context)

  return Boolean(command.xargs) && xargsProbes.some(tryProbe)
}

/** Whether one simple command breaks one rule, also probed when it runs through xargs. */
export default function forbids(rule: Rule, command: Command, context: Context): boolean {
  return plain(rule, command, context) || probed(rule, command, context)
}
