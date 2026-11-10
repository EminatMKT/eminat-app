/** Whether `words` holds `prefix`, word for word, from position `start` on. */
export default function startsAt(words: string[], prefix: string[], start: number): boolean {
  return prefix.every((word, index) => words[start + index] === word)
}
