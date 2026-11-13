import { RUNNER_OPTION } from './constants/patterns'

/** The words after the leading options, an option in `valued` skipped with the value after it. */
export default function skipOptions(words: string[], valued: string[]): string[] {
  const [first] = words

  if (!words.length || !RUNNER_OPTION.test(first)) return words

  const width = valued.includes(first) ? 2 : 1

  return skipOptions(words.slice(width), valued)
}
