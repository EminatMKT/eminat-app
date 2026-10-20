import type { ReactNode } from 'react'
import type { I18nKey } from '@/shared/i18n'
import type { CompareControls } from '@/shared/dedup'
import { Panel, StatBreakdownRow } from '@/shared/components/dashboard'
import type { PatientUnderReview } from '../types'
import previewRows from './previewRows'
import contactRows from './contactRows'

/** The "will be saved" box under the comparison grid: one label/value line per clinical field the
 *  RPC writes, then one per contact type listing every phone or email that stays on the winner. */
export default function renderPreview(
  winner: PatientUnderReview,
  loser: PatientUnderReview,
  valoresFinales: Record<string, unknown>,
  controls: CompareControls,
  t: (key: I18nKey) => string,
): ReactNode {
  const rows = [...previewRows(valoresFinales, t), ...contactRows(winner, loser, controls, t)]
  if (rows.length === 0) return null
  return (
    <Panel title={t('dedup.willBeSaved')}>
      {rows.map(({ field, label, value }) => <StatBreakdownRow key={field} label={label} value={value} />)}
    </Panel>
  )
}

// Only composes the shared `Panel` and `StatBreakdownRow`: the box, its heading and the
// label-left/value-right line already exist, so this draws no markup of its own.
