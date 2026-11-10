// Claude Code PreToolUse adapter: Bash hands over `tool_input.command`, the file tools
// (Edit, Write, MultiEdit, NotebookEdit) hand over `file_path` or `notebook_path`.
// It only translates the payload; the decision is the core's.
import runHook from './hook-io.mjs'

const present = (values) => values.filter((value) => typeof value === 'string' && value)

const toRequest = (payload) => {
  const input = payload.tool_input ?? {}
  return { command: input.command, paths: present([input.file_path, input.notebook_path]) }
}

await runHook(toRequest)
