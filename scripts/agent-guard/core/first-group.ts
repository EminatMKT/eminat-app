/** The first capture group a match filled, for patterns whose alternatives each capture. */
export default function firstGroup(match: RegExpMatchArray): string {
  const groups = match.slice(1)

  return groups.find((group) => group !== undefined)
}
