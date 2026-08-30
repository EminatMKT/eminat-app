'use client'
import { Button, ErrorList, Modal } from '@/shared/components/ui'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import CuandoYDonde from '@/features/reuniones/components/expediente/CuandoYDonde'
import DatosGenerales from '@/features/reuniones/components/expediente/DatosGenerales'
import { useReunion } from '@/features/reuniones/hooks'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — no hay markup propio salvo la grilla: es `Modal` con
// su `footer` fijo, los campos, y `Button`. El pie vivió un rato como clase local y se fue al
// `.pie` del Modal cuando apareció el tercer consumidor, que es cuando se gana el lugar.

type Props = {
  onCerrar: () => void
  onGuardada: () => void
}

export default function ExpedienteView({ onCerrar, onGuardada }: Props) {
  const { usuario } = useApp()
  const { t } = useT()
  const { form, errores, guardando, fallo, set, guardar } = useReunion(usuario?.id ?? null)

  // Cierra SÓLO si guardó: si no, el usuario perdería lo que escribió.
  async function guardarYCerrar() {
    if (await guardar()) onGuardada()
  }

  const acciones = (
    <>
      <Button kind="cancel" onClick={onCerrar} />
      <Button kind="confirm" onClick={guardarYCerrar} ocupado={guardando} />
    </>
  )

  return (
    <Modal title={t('reuniones.nueva')} subtitle={t('reuniones.nuevaSub')}
      anchoRem={46} onClose={onCerrar} footer={acciones}>
      <DatosGenerales form={form} set={set} />
      <CuandoYDonde form={form} set={set} />

      <ErrorList errores={errores} />
      {fallo && <p className={s.fallo}>{t('common.errorWithDetail', { detail: fallo })}</p>}
    </Modal>
  )
}
