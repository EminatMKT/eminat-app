// Runs one hook sample for the hook checks the way its CLI would: the generated command through
// `sh -c`, from the sample's root, with that root as the Claude project and the payload on stdin.
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { UTF8 } from '../adapters/constants'
import { CLAUDE_HOOK, CODEX_HOOK } from './constants'
import hookCommand from './hook-command'
import type { HookPlace, HookSample } from './types'

const SHELL = 'sh'
const SCRIPT_FLAG = '-c'
const HOOKS: Record<string, HookPlace> = { claude: CLAUDE_HOOK, codex: CODEX_HOOK }
const ROOTS: Record<string, string> = {
  empty: mkdtempSync(join(tmpdir(), SHELL)),
  repo: process.cwd(),
}

const envOf = (dir: string) => {
  const env = { PATH: process.env.PATH, CLAUDE_PROJECT_DIR: dir }

  return env
}

const optionsOf = ({ root, payload }: HookSample) => {
  const options = {
    cwd: ROOTS[root],
    env: envOf(ROOTS[root]),
    input: JSON.stringify(payload),
    encoding: UTF8,
  }

  return options
}

/** The finished `sh -c` process of the sample's hook command. */
export default function runSample(sample: HookSample) {
  const args = [SCRIPT_FLAG, hookCommand(HOOKS[sample.hook])]
  const result = spawnSync(SHELL, args, optionsOf(sample))

  return result
}
