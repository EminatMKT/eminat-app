import { useT, type I18nKey } from '@/shared/i18n'
import MultiValueChoice from './MultiValueChoice'
import type { MultiValueRow } from '../types'
import s from './index.module.css'

type Props = {
  labelKey: I18nKey
  rows: MultiValueRow[]
  excludedIds: string[]
  onToggle: (ids: string[]) => void
}

/** A multivalued field's checkbox group: one row per distinct value, named by the field label. */
export default function MultiValueCompare(props: Props) {
  const { labelKey, rows, excludedIds, onToggle } = props
  const { t } = useT()
  if (rows.length === 0) return null
  return (
    // centinela-exime: bloques-similares@7 — looked for a second fieldset+legend importer:
    // EditUserModal.tsx needs an unbounded rewrite; ListaRotulada has no visible legend; and
    // ProjectsTab.tsx already exceeds archivo_indivisible's hard ceiling.
    <fieldset className={s.group}>
      <legend className={s.label}>{t(labelKey)}</legend>
      {rows.map(row => (
        <MultiValueChoice
          key={row.text}
          text={row.text}
          keptIds={row.keptIds}
          removableIds={row.removableIds}
          excludedIds={excludedIds}
          onToggle={onToggle}
          hintText={t('dedup.keptOnWinner')}
          className={s.row}
        />
      ))}
    </fieldset>
  )
}

// Draws the multivalued field's checkbox group; MultiValueChoice draws each row.
