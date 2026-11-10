// The hook payloads the two CLIs send, as far as the adapters read them.
import type { GuardRequest } from '../core/types'

export type CommandField = string | string[]
export type ClaudeInput = { command?: string; file_path?: string; notebook_path?: string }
export type CodexInput = {
  command?: CommandField
  cmd?: string
  patch?: string
  input?: string
}
export type HookPayload<Input> = { cwd?: string; tool_input?: Input }
export type ToRequest<Input> = (payload: HookPayload<Input>) => GuardRequest
export type Spawned = { adapter: string; stdin: string; env?: Record<string, string> }
