import buildMergeValues from '../buildMergeValues'
import CONTACT_FIELDS from '../comparePacientes/contactFields'
import type { ContactView, PatientUnderReview } from '../types'

const trimmedValue = ({ valor }: ContactView) => valor.trim()

/** The merge values for the reviewed pair. `fusionarCampoSimple` fills a blank winner `telefono`/
 *  `email` from the loser without knowing what was unchecked: where the value it would adopt is
 *  one the reviewer dropped, the winner keeps its own value instead — even a blank one. */
export default function buildReviewMergeValues(
  winner: PatientUnderReview,
  loser: PatientUnderReview,
  choices: Record<string, string>,
  excludedIds: string[],
): Record<string, unknown> {
  const values = buildMergeValues(winner.paciente, loser.paciente, choices)
  for (const { key } of CONTACT_FIELDS) {
    const droppedRows = loser[key].filter(({ id }) => excludedIds.includes(id))
    const dropped = droppedRows.map(trimmedValue)
    const adopted = values[key]
    const adoptsDropped = typeof adopted === 'string' && dropped.includes(adopted.trim())
    if (adoptsDropped) values[key] = winner.paciente[key]
  }
  return values
}

// The winner's own value always matches its own snapshot, so the RPC's "matches either side"
// rule still holds for the override.
