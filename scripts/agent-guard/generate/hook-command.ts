// The shell command a CLI runs for the hook: the repo-local bun on that CLI's adapter. When bun
// or the adapter cannot run, it still exits 2 with the good-practice framing: it fails closed.
import { QUOTE } from '../adapters/constants'
import { LANGUAGES, SPACE } from '../core'
import { HOOK_TEMPLATE, HOOK_TOKENS, SOURCE } from './constants'
import fill from './fill'
import type { HookPlace } from './types'

const unavailable = LANGUAGES.map((language) => {
  const text = SOURCE.framing[language] + SPACE + SOURCE.unavailable[language]

  return QUOTE + text + QUOTE
})

/** The hook command of one CLI, as its config file stores it. */
export default function hookCommand({ root, adapter }: HookPlace): string {
  const pairs = [
    [HOOK_TOKENS.root, root],
    [HOOK_TOKENS.adapter, adapter],
    [HOOK_TOKENS.messages, unavailable.join(SPACE)],
  ]
  const command = pairs.reduce(fill, HOOK_TEMPLATE)

  return command
}
