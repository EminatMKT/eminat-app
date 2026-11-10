// Asks git one question. Git that ran and answered with a failure (no checkout, unknown ref)
// reads as null, an empty answer; git that could not run at all throws, so the hook blocks.
import { spawnSync } from 'node:child_process'
import { GIT } from '../core/constants'
import { SUCCESS, UTF8 } from './constants'

/** What a git command prints, trimmed, or null when it fails; throws when git cannot run. */
export default function ask(args: string[], cwd: string): string | null {
  const options = { cwd, encoding: UTF8 }
  const result = spawnSync(GIT, args, options)

  if (result.error) throw result.error

  return result.status === SUCCESS ? result.stdout.trim() : null
}
