'use client'
import { Field } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import ActivityAsignacion from '@/features/tasks/components/modals/ActivityAsignacion'
import SolicitantePicker from '@/features/tasks/components/modals/SolicitantePicker'
import { useTasks } from '@/features/tasks/components/TasksContext'

// centinela-exime: bloques-similares@2 — sale de `NewActivityModal`, que pasaba el techo de 150.
// Los campos ya usaban `Field`; lo único nuevo es que el emoji entra por su prop `icon` en vez
// de vivir dentro de la clave de i18n.

// QUÉ tarea es. Sin `index.module.css`: `Field` ya estiliza su control.
export default function ActivityCampos() {
  const { t } = useT()
  const { nuevaAct, setNuevaAct } = useTasks()

  return (
    <>
      <Field grande required label={t('stratix.new.taskTitle')}>
        <input type="text" autoFocus value={nuevaAct.titulo} placeholder={t('stratix.new.titlePh')}
          onChange={e => setNuevaAct(p => ({ ...p, titulo: e.target.value }))} />
      </Field>

      <Field label={t('stratix.new.desc')}>
        <textarea rows={3} value={nuevaAct.descripcion} placeholder={t('stratix.new.descPh')}
          onChange={e => setNuevaAct(p => ({ ...p, descripcion: e.target.value }))} />
      </Field>

      <ActivityAsignacion />
      <SolicitantePicker />
    </>
  )
}
