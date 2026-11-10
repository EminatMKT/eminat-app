import { FIRST_GROUP, SLASH } from './constants'
import { VERSION_SUFFIX } from './constants/patterns'

/** A program named without its path or `@version`: `/usr/bin/env` reads as `env`. */
export default function programName(word: string): string {
  const base = word.split(SLASH).pop()

  return base.replace(VERSION_SUFFIX, FIRST_GROUP)
}
