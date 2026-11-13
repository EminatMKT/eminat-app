// The Claude Code project settings: the permission rules, and the PreToolUse hook on Bash and
// the file tools; `onFailure: block` also blocks the call when the hook crashes or times out.
import { BLOCK } from '../core'
import {
  CLAUDE_HOOK,
  CLAUDE_MATCHERS,
  COMMAND_TYPE,
  SETTINGS_SCHEMA,
} from './constants'
import hookCommand from './hook-command'
import hookGroups from './hook-groups'
import permissions from './permissions'
import type { ClaudeHandler, ClaudeSettings } from './types'

/** The content of `.claude/settings.json`, as an object. */
export default function settings(): ClaudeSettings {
  const handler: ClaudeHandler = {
    type: COMMAND_TYPE,
    command: hookCommand(CLAUDE_HOOK),
    onFailure: BLOCK,
  }
  const hooks = hookGroups(CLAUDE_MATCHERS, handler)
  const content = { $schema: SETTINGS_SCHEMA, permissions: permissions(), hooks }

  return content
}
