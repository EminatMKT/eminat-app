// Shared I/O of the hook adapters: read the payload from stdin, ask the core, and answer with
// the PreToolUse contract both CLIs share: exit 2 with the reason on stderr blocks the call.
// A call it cannot answer (bad payload, git unable to run) is blocked too, never let through.
import { EOL } from 'node:os'
import decide from '../core/decide'
import {
  BLOCK_EXIT,
  EMPTY_PAYLOAD,
  GUARD_FAILED,
  MESSAGES,
  OBJECT,
  UTF8,
} from './constants'
import context from './context'
import type { HookPayload, ToRequest } from './types'

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = []

  for await (const chunk of process.stdin) chunks.push(chunk)

  return Buffer.concat(chunks).toString(UTF8)
}

const isPayload = <Input>(value: unknown): value is HookPayload<Input> =>
  typeof value === OBJECT && value !== null

const block = (text: string): void => {
  process.stderr.write(text + EOL)
  process.exitCode = BLOCK_EXIT
}

const answer = async <Input>(toRequest: ToRequest<Input>): Promise<void> => {
  const payload: unknown = JSON.parse((await readStdin()) || EMPTY_PAYLOAD)

  if (!isPayload<Input>(payload)) throw new TypeError(MESSAGES.invalidPayload)

  const verdict = decide(toRequest(payload), context(payload.cwd))

  // A verdict names a rule only when it blocks.
  if (verdict.rule) block(verdict.message)
}

/** Reads one hook call from stdin and blocks it (exit 2, reason on stderr) if the core does. */
export default async function runHook<Input>(toRequest: ToRequest<Input>): Promise<void> {
  await answer(toRequest).catch(() => block(GUARD_FAILED))
}
