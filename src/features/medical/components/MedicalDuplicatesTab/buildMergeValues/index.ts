import { pacienteDedupStrategy } from '@/features/medical/utils/pacienteDedupStrategy'
import type { Paciente } from '@/features/medical/types'

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).length === 0
}

/** The full `fusionar_duplicado` values for merging `loser` into `winner`: the adapter's pick for
 *  every column either side fills, the reviewer's clicks on top, and the winner's own blank where
 *  both are blank but spelled apart (`null` vs `''`), which the RPC still counts as differing. */
export default function buildMergeValues(
  winner: Paciente,
  loser: Paciente,
  choices: Record<string, string>,
): Record<string, unknown> {
  const winnerRow: Record<string, unknown> = { ...winner }
  const loserRow: Record<string, unknown> = { ...loser }
  const blanks: Record<string, unknown> = {}
  for (const [column, value] of Object.entries(winnerRow)) {
    const other = loserRow[column]
    if (isBlank(value) && isBlank(other) && value !== other) blanks[column] = value ?? null
  }
  const { resultado } = pacienteDedupStrategy.fusionar(winner, loser)
  const values = { ...blanks, ...resultado, ...choices }
  return values
}

// Every value is copied from one of the two rows (a click can only pick `a[campo]` or
// `b[campo]`), so the RPC's "matches either snapshot" check holds for the whole object.
