// A prefix pattern spelled out word by word: one word list per combination of its unions, the
// form a Claude Code Bash rule needs, since it has no union syntax.
import { NO_WORDS } from './constants/patterns'
import type { Element, Pattern } from './types'

const grow = (heads: string[][], element: Element): string[][] =>
  heads.flatMap((head) => [element].flat().map((word) => [...head, word]))

/** Every word list the pattern matches the start of, in the order its unions list them. */
export default function expand(pattern: Pattern): string[][] {
  const lists = pattern.reduce(grow, NO_WORDS)

  return lists
}
