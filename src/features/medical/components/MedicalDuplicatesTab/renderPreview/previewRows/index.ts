import type { I18nKey } from '@/shared/i18n'
import FIELD_MAPS from '@/features/medical/components/MedicalDuplicatesTab/fieldMaps'
import type { PreviewRow } from './types'

function shown(value: unknown, blank: string): string {
  const text = value === null || value === undefined ? '' : String(value)
  const filled = text.trim().length > 0
  return filled ? text : blank
}

/** The merge preview's clinical lines: one per labelled field present in `valoresFinales`, in the
 *  grid's order, with a blank value spelled out instead of left empty. Contacts are not here. */
export default function previewRows(
  valoresFinales: Record<string, unknown>,
  t: (key: I18nKey) => string,
): PreviewRow[] {
  const blank = t('import.merge.noValue')
  const labelled = Object.entries(FIELD_MAPS.labelKeys)
  const written = labelled.filter(([field]) => Object.hasOwn(valoresFinales, field))
  const rows = written.map(([field, labelKey]) => ({
    field,
    label: t(labelKey),
    value: shown(valoresFinales[field], blank),
  }))
  return rows
}

// Walks the grid's clinical label catalog, not the values: an id, a timestamp, or the single
// scalar `telefono`/`email` stays out — `contactRows` lists every surviving contact instead.
