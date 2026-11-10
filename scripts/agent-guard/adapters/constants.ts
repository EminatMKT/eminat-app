// Values the hook adapters read payloads, git and Codex patches with, and the answer they give
// when they cannot reach a verdict. A patch heredoc is the one apply_patch reads from stdin.
import {
  HEAD,
  LANGUAGES,
  NEWLINE,
  RULES,
  SPACE,
} from '../core/constants'
import type { CodexInput } from './types'

const REV_PARSE = 'rev-parse'
const GLOBAL = 'g'
const HEREDOC_START = String.raw`apply_patch[^\S\n]*<<-?[^\S\n]*(['"]?)(\w+)\1[^\S\n]*\n`
const HEREDOC_BODY = String.raw`\*\*\* Begin Patch\n[\s\S]*?\n\*\*\* End Patch\n\2(?=\n|$)`

export const UTF8: BufferEncoding = 'utf8'
export const SUCCESS = 0
export const BLOCK_EXIT = 2
export const EMPTY_PAYLOAD = '{}'
export const OBJECT = 'object'
export const STRING = 'string'
export const NO_INPUT = {}
export const TOPLEVEL = [REV_PARSE, '--show-toplevel']
export const BRANCH_ARGS = [REV_PARSE, '--abbrev-ref', HEAD]
export const LS_TREE = ['ls-tree', '-r', '--name-only', HEAD, '--']
export const CHANGED_SINCE_BASE = ['diff', '--name-only', `origin/main...${HEAD}`]
export const PATCH_FIELDS: (keyof CodexInput)[] = ['patch', 'input', 'command', 'cmd']
export const PATCH_TARGET = /^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm
export const PATCH_HEREDOC = new RegExp(HEREDOC_START + HEREDOC_BODY, GLOBAL)
export const APPLY_PATCH = 'apply_patch'
export const SAFE_WORD = /^[\w./=:@%+-]+$/
export const QUOTE = "'"
export const ESCAPED_QUOTE = "'\\''"
export const GUARD_FAILED = LANGUAGES.map(
  (language) => RULES.framing[language] + SPACE + RULES.unavailable[language],
).join(NEWLINE)
export const MESSAGES = {
  invalidPayload: 'agent-guard: the hook payload on stdin is not a JSON object',
}
