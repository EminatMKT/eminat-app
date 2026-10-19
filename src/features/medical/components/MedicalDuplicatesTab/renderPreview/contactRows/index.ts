import type { I18nKey } from '@/shared/i18n'
import { mergeMultiValueRows, type CompareControls } from '@/shared/dedup'
import CONTACT_FIELDS from '@/features/medical/components/MedicalDuplicatesTab/comparePacientes/contactFields'
import contactText from '@/features/medical/components/MedicalDuplicatesTab/comparePacientes/contactText'
import type { PatientUnderReview } from '@/features/medical/components/MedicalDuplicatesTab/types'
import type { PreviewRow } from '../previewRows/types'

const SEPARATOR = ', '

/** The merge preview's contact lines: one per contact type, listing every value that stays on the
 *  winner — its own, plus each loser value the reviewer left checked — or a spelled-out blank. */
export default function contactRows(
  winner: PatientUnderReview,
  loser: PatientUnderReview,
  { excludedIds }: CompareControls,
  t: (key: I18nKey) => string,
): PreviewRow[] {
  const blank = t('import.merge.noValue')
  const rows = CONTACT_FIELDS.map(({ key, labelKey }) => {
    const merged = mergeMultiValueRows(winner[key], loser[key], contactText)
    const surviving = merged.filter(({ keptIds, removableIds }) =>
      keptIds.length > 0 || removableIds.some(id => !excludedIds.includes(id)))
    const texts = surviving.map(({ text }) => text)
    const value = texts.length > 0 ? texts.join(SEPARATOR) : blank
    return { field: key, label: t(labelKey), value }
  })
  return rows
}

// Contacts are rows, not columns: what survives is decided by `excludedIds`, never by the RPC's
// scalar `telefono`/`email`. Merging by the grid's own `mergeMultiValueRows` keeps the two in step.
