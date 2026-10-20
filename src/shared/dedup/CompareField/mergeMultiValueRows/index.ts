import type { MultiValueItem, MultiValueRow } from '../types'

/** The union of both sides, one row per distinct text, the winner's values first. Every id behind
 *  a text rides along, so dropping a row drops all of the loser's copies of that value. */
export default function mergeMultiValueRows<E extends MultiValueItem>(
  winner: E[],
  loser: E[],
  textOf: (item: E) => string,
): MultiValueRow[] {
  const rows = new Map<string, MultiValueRow>()
  const rowFor = (text: string) => {
    const found = rows.get(text)
    if (found) return found
    const created: MultiValueRow = { text, keptIds: [], removableIds: [] }
    rows.set(text, created)
    return created
  }
  for (const item of winner) rowFor(textOf(item)).keptIds.push(item.id)
  for (const item of loser) rowFor(textOf(item)).removableIds.push(item.id)
  const merged = Array.from(rows.values())
  return merged
}

// Pure union of the two sides by display text; the React layer only renders what this returns.
