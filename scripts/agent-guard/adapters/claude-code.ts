// Claude Code PreToolUse adapter: Bash hands over `tool_input.command`, the file tools (Edit,
// Write, MultiEdit, NotebookEdit) hand over `file_path` or `notebook_path`. It only translates
// the payload; the decision is the core's.
import { NO_INPUT } from './constants'
import runHook from './hook-io'
import isText from './is-text'
import type { ClaudeInput, ToRequest } from './types'

const isPath = (value: unknown): value is string => isText(value) && value.length > 0

const toRequest: ToRequest<ClaudeInput> = (payload) => {
  const input: ClaudeInput = payload.tool_input ?? NO_INPUT
  const paths = [input.file_path, input.notebook_path].filter(isPath)
  const request = { command: input.command, paths }

  return request
}

await runHook(toRequest)
