/** The words that come right after one of the markers (`-c key=value`, `> file`). */
export default function followers(words: string[], markers: string[]): string[] {
  const follows = (_word: string, index: number): boolean => markers.includes(words[index - 1])

  return words.filter(follows)
}
