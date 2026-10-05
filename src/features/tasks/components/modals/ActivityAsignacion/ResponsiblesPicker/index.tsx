'use client'
import { Button, MultiCombobox, type ComboOption, type ComboSearch } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import type { ActividadResponsable } from '@/features/tasks/types'
import { toggleLeader, toggleResponsable } from '@/features/tasks/hooks/useActividadForm/responsables'
import LeaderCrown from '../LeaderCrown'
import pickerDisplay from '../picker-display'

type Props = {
  members: ReadonlyArray<Record<'id' | 'nombre', string>>
  rows: ActividadResponsable[]
  onChange: (rows: ActividadResponsable[]) => void
}

export default function ResponsiblesPicker({ members, rows, onChange }: Props) {
  const { t } = useT()
  const options = members.map(({ id, nombre }) => ({ id, label: nombre }))
  const selected = rows.map(row => row.usuario_id)
  const toggle = (id: string) => onChange(toggleResponsable(rows, id, !selected.includes(id)))
  const crown = ({ id, label }: ComboOption) => {
    const row = rows.find(r => r.usuario_id === id)
    return row && <LeaderCrown name={label} leads={row.es_lider} onCrown={() => onChange(toggleLeader(rows, id))} />
  }
  const empty = ({ query, clear }: ComboSearch) => {
    if (members.length === 0) return t('tasks.responsibles.emptyRoster')
    const queryVars = { query }
    return <>{t('tasks.responsibles.noResults', queryVars)}<Button kind="clear" label={t('tasks.responsibles.clearSearch')} onClick={clear} /></>
  }
  return (
    <MultiCombobox options={options} selected={selected} onToggle={toggle} action={crown} empty={empty}
      display={pickerDisplay(members, rows, t('stratix.new.select'))} searchPlaceholder={t('tasks.responsibles.searchPh')} />
  )
}

// The responsables picker of the task form: a compact box like the Brand select beside it, that
// reads the card's `👑 Leader +N` while closed and opens into the search over the assignable
// members, one option per person and the crown on the chosen ones. An empty roster and a search
// with no match are two different messages; the second carries the one way to clear the search.
