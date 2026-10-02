'use client'
import { useState } from 'react'
import { Crown } from 'lucide-react'
import { Button, ChecklistChoice, ListaRotulada, ListToolbar } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import type { ActividadResponsable } from '@/features/tasks/types'
import responsablesForm from '@/features/tasks/hooks/useActividadForm/responsables'

type Props = {
  members: ReadonlyArray<Record<'id' | 'nombre', string>>
  rows: ActividadResponsable[]
  onChange: (rows: ActividadResponsable[]) => void
}

export default function ResponsablesChecklist({ members, rows, onChange }: Props) {
  const { t } = useT()
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const visible = members.filter(m => m.nombre.toLowerCase().includes(needle))
  const noMatches = visible.length === 0
  const emptyLabel = noMatches ? t('tasks.responsibles.empty') : undefined
  const clear = <Button kind="clear" deshabilitado={!query} onClick={() => setQuery('')} />
  return (
    <>
      <ListToolbar busqueda={query} setBusqueda={setQuery} placeholderKey="tasks.responsibles.searchPh"
        action={clear} />
      <ListaRotulada label={t('tasks.responsibles.label')} emptyLabel={emptyLabel}>
        {visible.map(m => {
          const row = rows.find(r => r.usuario_id === m.id)
          const leaderAria = { name: m.nombre }
          return (
            <ChecklistChoice key={m.id} label={m.nombre} checked={Boolean(row)}
              onChecked={checked => onChange(responsablesForm.toggleResponsable(rows, m.id, checked))}
              actionIcon={<Crown aria-hidden size={16} />}
              actionLabel={t('tasks.responsibles.leaderToggleAria', leaderAria)}
              actionPressed={row?.es_lider ?? false}
              onAction={() => onChange(responsablesForm.toggleLeader(rows, m.id))} />
          )
        })}
      </ListaRotulada>
    </>
  )
}

// Searchable checklist of who works on a task. Any number of people (zero included) can be
// checked; the monochrome crown on a checked row makes that person the single, optional leader.
