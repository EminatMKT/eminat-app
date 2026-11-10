// Codex PreToolUse adapter: a shell call hands over `tool_input.command` (a string or an
// argv array) or `tool_input.cmd`; an apply_patch call carries its target files in the
// patch headers. A patch body is file text, never a command: it only feeds path analysis
// and is cut out of the shell line before command analysis (so context lines inside it do
// not block an edit). Only complete `*** Begin Patch` ... `*** End Patch` bodies are cut;
// an unterminated one stays in the line and is read as commands. It only translates the
// payload; the decision is the core's.
import runHook from './hook-io.mjs'

const PATCH_TARGET = /^\*\*\* (?:(?:Add|Update|Delete) File|Move to): (.+)$/gm
const PATCH_BODY = /\*\*\* Begin Patch[\s\S]*?\*\*\* End Patch/g
const SPACE = ' '
const NOTHING = ''

const quote = (word) => (/^[\w./=:@%+-]+$/.test(word) ? word : `'${word.replaceAll("'", "'\\''")}'`)

const joined = (command) => (Array.isArray(command) ? command.map(quote).join(SPACE) : command)

const line = (command) => joined(command)?.replace(PATCH_BODY, NOTHING)

const patchPaths = (input) =>
  [input.patch, input.input, input.command, input.cmd]
    .flat()
    .filter((text) => typeof text === 'string')
    .flatMap((text) => [...text.matchAll(PATCH_TARGET)].map((match) => match[1].trim()))

const toRequest = (payload) => {
  const input = payload.tool_input ?? {}
  return { command: line(input.command ?? input.cmd), paths: patchPaths(input) }
}

await runHook(toRequest)
