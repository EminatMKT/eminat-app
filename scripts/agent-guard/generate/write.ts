// `--write`: every generated file under a root, creating its folders first.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { RECURSIVE } from './constants'
import targets from './targets'
import type { Target } from './types'

const writeOne = (target: Target, root: string): string => {
  const { path, render } = target
  const file = join(root, path)

  mkdirSync(dirname(file), RECURSIVE)
  writeFileSync(file, render())

  return path
}

/** Writes every generated file under the root and returns the paths it wrote. */
export default function writeAll(root: string): string[] {
  const written = targets().map((target) => writeOne(target, root))

  return written
}
