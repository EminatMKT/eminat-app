import type { ReactNode } from 'react'
import type { I18nKey } from '@/shared/i18n'
import { Panel, StatBreakdownRow } from '@/shared/components/dashboard'
import previewRows from './previewRows'

/** The "will be saved" box under the comparison grid: one label/value line per field the merge
 *  writes, read from the very values the RPC receives. Nothing when no such field is written. */
export default function renderPreview(
  valoresFinales: Record<string, unknown>,
  t: (key: I18nKey) => string,
): ReactNode {
  const rows = previewRows(valoresFinales, t)
  if (rows.length === 0) return null
  return (
    <Panel title={t('dedup.willBeSaved')}>
      {rows.map(({ field, label, value }) => <StatBreakdownRow key={field} label={label} value={value} />)}
    </Panel>
  )
}

// Only composes the shared `Panel` and `StatBreakdownRow`: the box, its heading and the
// label-left/value-right line already exist, so this draws no markup of its own.
