import type { I18nKey } from '@/shared/i18n'
import PREVIEW_LABEL_KEYS from '../previewLabelKeys'
import type { PreviewRow } from './types'

function shown(value: unknown, blank: string): string {
  const text = value === null || value === undefined ? '' : String(value)
  const filled = text.trim().length > 0
  return filled ? text : blank
}

/** The merge preview's lines: one per labelled field present in `valoresFinales`, in the grid's
 *  order, with a blank value spelled out instead of left empty. */
export default function previewRows(
  valoresFinales: Record<string, unknown>,
  t: (key: I18nKey) => string,
): PreviewRow[] {
  const blank = t('import.merge.noValue')
  const labelled = Object.entries(PREVIEW_LABEL_KEYS)
  const written = labelled.filter(([field]) => Object.hasOwn(valoresFinales, field))
  const rows = written.map(([field, labelKey]) => ({
    field,
    label: t(labelKey),
    value: shown(valoresFinales[field], blank),
  }))
  return rows
}

// Walks the label catalog, not the values: a column the merge writes but the grid never names
// (an id, a timestamp) stays out of the preview, and the order matches the grid's.
