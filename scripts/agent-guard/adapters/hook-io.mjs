// Shared I/O of the hook adapters: read the hook payload from stdin, ask the core, and
// answer with the PreToolUse contract both CLIs share (exit 2 + reason on stderr blocks
// the tool call; exit 0 lets it run). Each adapter only says how to read its payload.
import decide from '../core/decide.mjs'
import context from './context.mjs'

const BLOCK_EXIT = 2

const readStdin = async () => {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

const block = (text) => {
  process.stderr.write(`${text}\n`)
  process.exitCode = BLOCK_EXIT
}

export default async function runHook(toRequest) {
  const payload = JSON.parse((await readStdin()) || '{}')
  const verdict = decide(toRequest(payload), context(payload.cwd))
  if (verdict.decision === 'block') block(verdict.message)
}
