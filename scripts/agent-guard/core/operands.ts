import { OPTION } from './constants/patterns'

/** The words that are not options (`-x`, `--long`). */
export default function operands(words: string[]): string[] {
  return words.filter((word) => !OPTION.test(word))
}
