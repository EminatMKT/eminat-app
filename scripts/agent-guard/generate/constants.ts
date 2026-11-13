// What the config generators write: the rules file they read, the files they produce, how each
// CLI wires the hook (failing closed when the repo-local bun is missing) and the command line.
import { BLOCK_EXIT } from '../adapters/constants'
import { SPACE } from '../core'
import json from '../rules.json' with { type: 'json' }
import type { GuardFile, HookPlace } from './types'

const HAS_BUN = '[ -x "{root}/node_modules/.bin/bun" ] &&'
const BUN = '"{root}/node_modules/.bin/bun"'
const ADAPTER = '"{root}/scripts/agent-guard/adapters/{adapter}"'
const KEEP_STATUS = '|| { rc=$?;'
const EXPLAIN = `[ "$rc" -eq ${BLOCK_EXIT} ] || printf '%s\\n' {messages} >&2;`
const FAIL_CLOSED = `exit ${BLOCK_EXIT}; }`

export const SOURCE: GuardFile = json
export const SETTINGS_PATH = '.claude/settings.json'
export const CODEX_HOOKS_PATH = '.codex/hooks.json'
export const EXECPOLICY_PATH = '.codex/rules/agent-guard.rules'
export const SETTINGS_SCHEMA = 'https://json.schemastore.org/claude-code-settings.json'
export const CLAUDE_MATCHERS = ['Bash', 'Edit|Write|MultiEdit|NotebookEdit']
export const CODEX_MATCHERS = ['Bash|apply_patch']
export const CLAUDE_HOOK: HookPlace = { root: '$CLAUDE_PROJECT_DIR', adapter: 'claude-code.ts' }
export const CODEX_HOOK: HookPlace = {
  root: '$(git rev-parse --show-toplevel 2>/dev/null)',
  adapter: 'codex.ts',
}
export const CODEX_DESCRIPTION =
  'Generated from scripts/agent-guard/rules.json by `pnpm guard:generate`; do not edit by hand.'
export const CODEX_STATUS = 'agent-guard'
export const COMMAND_TYPE = 'command'
export const HOOK_TOKENS = { root: '{root}', adapter: '{adapter}', messages: '{messages}' }
export const HOOK_TEMPLATE = [HAS_BUN, BUN, ADAPTER, KEEP_STATUS, EXPLAIN, FAIL_CLOSED].join(SPACE)
export const JSON_INDENT = 2
export const NO_REPLACER: null = null
export const RECURSIVE = { recursive: true }
export const WRITE = '--write'
export const CHECK = '--check'
export const ARGS_START = 2
export const FAILURE_EXIT = 1
export const DRIFT = {
  missing: 'is missing; `pnpm guard:generate` writes it from rules.json',
  differs: 'differs from rules.json; `pnpm guard:generate` rewrites it',
}
export const MESSAGES = {
  usage: 'agent-guard generate: pass --write or --check, then optionally a root other than cwd',
  prefix: 'agent-guard: ',
  wrote: 'agent-guard: wrote ',
  clean: 'agent-guard: the generated files match rules.json',
}
