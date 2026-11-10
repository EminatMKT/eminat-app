// Command line of the config generators: `--write` writes every generated file, `--check` exits
// 1 naming each one that is missing or differs (the drift test). An optional second argument
// is the root to work under instead of the current directory, the repo root under pnpm.
import { EOL } from 'node:os'
import { resolve } from 'node:path'
import {
  ARGS_START,
  CHECK,
  FAILURE_EXIT,
  MESSAGES,
  WRITE,
} from './constants'
import drift from './drift'
import writeAll from './write'

const [mode, out] = process.argv.slice(ARGS_START)
const root = resolve(out ?? process.cwd())

const fail = (lines: string[]): void => {
  for (const line of lines) process.stderr.write(line + EOL)

  process.exitCode = FAILURE_EXIT
}

const check = (): void => {
  const reports = drift(root)

  if (reports.length) fail(reports)
  else process.stdout.write(MESSAGES.clean + EOL)
}

const write = (): void => {
  for (const path of writeAll(root)) process.stdout.write(MESSAGES.wrote + path + EOL)
}

const usage = (): void => fail([MESSAGES.usage])

const MODES: Record<string, () => void> = { [WRITE]: write, [CHECK]: check }
const run = MODES[mode] ?? usage

run()
