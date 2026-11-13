// The drift test behind `--check`: each generated file whose copy under a root is missing, or
// differs from what rules.json generates now. A file not written yet is drift too.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { UTF8 } from '../adapters/constants'
import { NONE, SPACE } from '../core'
import { DRIFT, MESSAGES } from './constants'
import targets from './targets'
import type { Target } from './types'

const stateOf = ({ path, render }: Target, root: string): string | null => {
  const file = join(root, path)

  if (!existsSync(file)) return DRIFT.missing

  const state = readFileSync(file, UTF8) === render() ? null : DRIFT.differs

  return state
}

const report = (target: Target, root: string): string[] => {
  const { path } = target
  const state = stateOf(target, root)
  const reports = state ? [MESSAGES.prefix + path + SPACE + state] : NONE

  return reports
}

/** One line per generated file that is missing or differs under the root; none when clean. */
export default function drift(root: string): string[] {
  const reports = targets().flatMap((target) => report(target, root))

  return reports
}
