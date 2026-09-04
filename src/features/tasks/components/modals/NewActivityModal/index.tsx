'use client'
import { useState } from 'react'
import { ConfirmModal, Modal } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import ActivityAcciones from '@/features/tasks/components/modals/ActivityAcciones'
import ActivityCampos from '@/features/tasks/components/modals/ActivityCampos'
import ActivityPlanificacion from '@/features/tasks/components/modals/ActivityPlanificacion'
import { hayCambios } from '@/features/tasks/utils/act-form'
import { useTasks } from '@/features/tasks/components/TasksContext'

// centinela-exime: bloques-similares@2 — no hay markup nuevo: los campos salieron a
// `ActivityCampos` y `ActivityPlanificacion`, los botones son `Button` y el pie es el `footer`
// de `Modal`. `ActivityFormHeader` desapareció: era el encabezado del Modal reimplementado.
export default function NewActivityModal() {
  const { t } = useT()
  const { modalNuevaAct, nuevaAct, crearActividad, actEditando, cerrarFormAct } = useTasks()
  // Sólo al EDITAR: crear una tarea de más se borra, pero pisar una que ya existe no tiene
  // vuelta —el guardado es last-write-wins—, así que ahí sí se pregunta antes.
  const [confirmarGuardado, setConfirmarGuardado] = useState(false)

  async function guardarEdicion() {
    await crearActividad()
    setConfirmarGuardado(false)
  }

  // Crear no pregunta; editar sólo si el form difiere del original.
  function alGuardar() {
    if (actEditando && hayCambios(nuevaAct, actEditando)) { setConfirmarGuardado(true); return }
    void crearActividad()
  }

  // 40rem: la fila de planificación son tres columnas desde que entró la fecha de inicio.
  if (!modalNuevaAct) return null

  return (
    <Modal anchoRem={40} onClose={cerrarFormAct} footer={<ActivityAcciones onGuardar={alGuardar} />}
      title={actEditando ? t('stratix.edit.title') : t('stratix.new.title')}
      subtitle={actEditando ? t('stratix.edit.sub') : t('stratix.new.sub')}>
      <ActivityCampos />
      <ActivityPlanificacion />

      {confirmarGuardado && (
        <ConfirmModal title={t('stratix.edit.confirmTitle')} message={t('stratix.edit.confirmMsg')}
          confirmLabel={t('common.saveChanges')} onConfirm={guardarEdicion}
          onClose={() => setConfirmarGuardado(false)} />
      )}
    </Modal>
  )
}
