// Codex PreToolUse adapter: a shell call hands over `command` (a string or an argv array) or
// `cmd`, read as a shell line by command-line; apply_patch names its files in the patch headers,
// which only feed the path analysis.
import commandLine from './command-line'
import { NO_INPUT, PATCH_FIELDS, PATCH_TARGET } from './constants'
import runHook from './hook-io'
import isText from './is-text'
import type { CodexInput, ToRequest } from './types'

const targets = (text: string): string[] =>
  [...text.matchAll(PATCH_TARGET)].map((match) => match[1].trim())

const patchPaths = (input: CodexInput): string[] => {
  const values = PATCH_FIELDS.map((field) => input[field])
  const texts = values.flat().filter(isText)

  return texts.flatMap(targets)
}

const toRequest: ToRequest<CodexInput> = (payload) => {
  const input: CodexInput = payload.tool_input ?? NO_INPUT
  const shell = input.command ?? input.cmd
  const request = { command: commandLine(shell), paths: patchPaths(input) }

  return request
}

await runHook(toRequest)
