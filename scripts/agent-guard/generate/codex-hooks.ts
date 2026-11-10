// The Codex project hooks: the PreToolUse hook on shell commands and apply_patch. Codex runs a
// project hook only after each user trusts it in `/hooks`.
import {
  CODEX_DESCRIPTION,
  CODEX_HOOK,
  CODEX_MATCHERS,
  CODEX_STATUS,
  COMMAND_TYPE,
} from './constants'
import hookCommand from './hook-command'
import hookGroups from './hook-groups'
import type { CodexHandler, CodexHooks } from './types'

/** The content of `.codex/hooks.json`, as an object. */
export default function codexHooks(): CodexHooks {
  const handler: CodexHandler = {
    type: COMMAND_TYPE,
    command: hookCommand(CODEX_HOOK),
    statusMessage: CODEX_STATUS,
  }
  const content = { description: CODEX_DESCRIPTION, hooks: hookGroups(CODEX_MATCHERS, handler) }

  return content
}
