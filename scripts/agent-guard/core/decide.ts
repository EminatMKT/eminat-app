// The single decision point of the agent guard: every adapter (Claude Code, Codex) hands it
// what the agent is about to do and where it stands, and relays the verdict. No rule lives
// anywhere else; `context.committed` lists the committed files the adapter looked up.
import commandRule from './command-rule'
import { ALLOWED, BLOCK, NOTHING } from './constants'
import message from './message'
import pathRule from './path-rule'
import type { Context, GuardRequest, Verdict } from './types'

/** The verdict for one tool call: blocked by the first rule it breaks, or allowed. */
export default function decide(request: GuardRequest, context: Context): Verdict {
  const rule = commandRule(request.command ?? NOTHING, context) ?? pathRule(request.paths, context)

  if (!rule) return ALLOWED

  const verdict = { decision: BLOCK, rule: rule.id, message: message(rule) }

  return verdict
}
