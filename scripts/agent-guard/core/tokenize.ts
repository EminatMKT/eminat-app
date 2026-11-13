// Splits a shell line into words and operators, without running or expanding anything: a
// backslash-newline joins two lines, a newline separates commands like `;`, a backslash escapes
// any character, and any other character becomes a one-character word, so the scan never stops.
import { FIRST_GROUP, NOTHING } from './constants'
import {
  CONTINUATION,
  ESCAPED,
  PIECE,
  QUOTED,
  REDIRECT,
  TRAILING_BLANK,
} from './constants/patterns'
import type { Piece } from './types'

const unquoteMatch = (...groups: string[]): string => {
  const [, single, double, escaped] = groups
  const unescaped = double?.replace(ESCAPED, FIRST_GROUP)

  return single ?? (double === undefined ? escaped : unescaped)
}

const unquote = (word: string): string => word.replace(QUOTED, unquoteMatch)

// A redirection (`>`, `>>`) stays in the words, so a guarded file written to is seen.
const separates = (operator: string): boolean => Boolean(operator) && !REDIRECT.test(operator)

const piece = ([, operator, word]: RegExpMatchArray): Piece => {
  if (separates(operator)) return { operator }

  return { word: unquote(word ?? operator) }
}

/** The words and operators of one shell line, in order. */
export default function tokenize(line: string): Piece[] {
  const joined = line.replace(CONTINUATION, NOTHING)
  const trimmed = joined.replace(TRAILING_BLANK, NOTHING)
  const matches = [...trimmed.matchAll(PIECE)]

  return matches.map(piece)
}
