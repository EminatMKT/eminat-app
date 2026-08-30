'use client'
import { useState } from 'react'
import { ConfirmModal, ErrorList, Modal } from '@/shared/components/ui'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import CuandoYDonde from '@/features/reuniones/components/expediente/CuandoYDonde'
import DatosGenerales from '@/features/reuniones/components/expediente/DatosGenerales'
import ExpedienteAcciones from '@/features/reuniones/components/expediente/ExpedienteAcciones'
import ParticipantesPanel from '@/features/reuniones/components/participantes/ParticipantesPanel'
import { useReunion } from '@/features/reuniones/hooks'
import s from './index.module.css'
// centinela-exime: bloques-similares@2 — no hay markup propio salvo la grilla: es `Modal` con su
// `footer` fijo, los campos, el panel de participantes y `ConfirmModal`.
type Props = {
  /** Con id edita esa reunión y muestra su mesa; sin él, crea una. */
  reunionId?: string
  onCerrar: () => void
  onGuardada: () => void
}

export default function ExpedienteView({ reunionId, onCerrar, onGuardada }: Props) {
  const { usuario } = useApp()
  const { t } = useT()
  const { form, errores, guardando, fallo, set, guardar } = useReunion(usuario?.id ?? null, reunionId)
  const [confirmando, setConfirmando] = useState(false)
  // Cierra SÓLO si guardó: si no, el usuario perdería lo que escribió.
  async function guardarYCerrar() {
    setConfirmando(false)
    if (await guardar()) onGuardada()
  }

  return (
    <Modal title={t(reunionId ? 'reuniones.editar' : 'reuniones.nueva')}
      subtitle={t(reunionId ? 'reuniones.editarSub' : 'reuniones.nuevaSub')}
      anchoRem={46} onClose={onCerrar}
      footer={<ExpedienteAcciones editando={Boolean(reunionId)} guardando={guardando}
        onCancelar={onCerrar} onGuardar={reunionId ? () => setConfirmando(true) : guardarYCerrar} />}>
      <DatosGenerales form={form} set={set} />
      <CuandoYDonde form={form} set={set} />
      {reunionId && <ParticipantesPanel reunionId={reunionId} />}
      <ErrorList errores={errores} />
      {fallo && <p className={s.fallo}>{t('common.errorWithDetail', { detail: fallo })}</p>}
      {confirmando && (
        <ConfirmModal title={t('reuniones.pisar.title')} message={t('reuniones.pisar.msg')}
          confirmLabel={t('common.saveChanges')} onConfirm={guardarYCerrar}
          onClose={() => setConfirmando(false)} />
      )}
    </Modal>
  )
}
