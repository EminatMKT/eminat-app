import type { Piece } from './types'

/** Groups the words of a tokenized line into one list per simple command. */
export default function split(pieces: Piece[]): string[][] {
  const groups: string[][] = [[]]

  for (const { operator, word } of pieces) {
    if (operator) groups.push([])
    else groups[groups.length - 1].push(word)
  }

  return groups
}
