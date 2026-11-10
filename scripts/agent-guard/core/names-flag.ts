// Whether an option names one of the flags the way git reads it: exactly, with an `=value`, or
// abbreviated (git accepts any unambiguous start of a long option, so every start of a guarded
// one counts: `--force-with-lea`).
import { LONG_OPTION } from './constants/patterns'
import flagName from './flag-name'

/** Whether `word` is one of `flags`, given as is, with a value or abbreviated. */
export default function namesFlag(word: string, flags: string[]): boolean {
  const name = flagName(word)
  const abbreviates = LONG_OPTION.test(name) && flags.some((flag) => flag.startsWith(name))

  return flags.includes(name) || abbreviates
}
