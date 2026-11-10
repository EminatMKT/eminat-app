// Runs one adapter script the way a CLI runs its hook, for the adapter checks: the real file,
// spawned from the repo root with the payload on stdin, where `{root}` stands for that root.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { HOOK_TOKENS } from '../generate/constants'
import { UTF8 } from './constants'
import type { Spawned } from './types'

const SELF = '.'
const UP_TO_ROOT = '../../..'
const HERE = fileURLToPath(new URL(SELF, import.meta.url))
const ROOT = fileURLToPath(new URL(UP_TO_ROOT, import.meta.url))

/** The exit code, stdout and stderr of one adapter run, in its own environment if given. */
export default function spawnAdapter({ adapter, stdin, env }: Spawned) {
  const options = {
    cwd: ROOT,
    input: stdin.replaceAll(HOOK_TOKENS.root, ROOT),
    encoding: UTF8,
    env: env ?? process.env,
  }

  return spawnSync(process.execPath, [HERE + adapter], options)
}
