'use client'
import { RowMenu } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import { useTasks } from '@/features/tasks/components/TasksContext'
import { actividadAPlantilla } from '@/features/tasks/utils/act-form'
import type { Actividad } from '@/features/tasks/types'

type Props = { a: Actividad }

export default function DuplicateTaskMenu({ a }: Props) {
  const { t } = useT()
  const { setModalNuevaAct, setNuevaAct } = useTasks()
  const duplicate = () => { setNuevaAct(actividadAPlantilla(a)); setModalNuevaAct(true) }
  return <RowMenu label={t('common.actions')} items={[{ kind: 'duplicate', label: t('common.duplicate'), onClick: duplicate }]} />
}

// The row menu of a task in the Kanban card and the requests table: its one action opens the
// new-task form prefilled from this task. Both views had the same three lines copied.
