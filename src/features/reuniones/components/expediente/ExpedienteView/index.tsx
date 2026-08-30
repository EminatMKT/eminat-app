'use client'
import { Button, ErrorList, Modal } from '@/shared/components/ui'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import CuandoYDonde from '@/features/reuniones/components/expediente/CuandoYDonde'
import DatosGenerales from '@/features/reuniones/components/expediente/DatosGenerales'
import { useReunion } from '@/features/reuniones/hooks'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — leí `ls src/shared/components/ui` entero: esto es
// `Modal` + los campos + `Button`, sin markup propio salvo la grilla y el pie. A `Modal` no le
// faltó ningún prop, y los botones SÍ salieron a `shared` (`Button`), que es la salida 2 de la
// regla. El pie quedó como una clase acá: seis declaraciones con un solo uso no son un componente.

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

  return (
    <Modal title={t('reuniones.nueva')} width={620} onClose={onCerrar}>
      <div className={s.grilla}>
        <DatosGenerales form={form} set={set} />
        <CuandoYDonde form={form} set={set} />
      </div>

      <ErrorList errores={errores} />
      {fallo && <p className={s.fallo}>{t('common.errorWithDetail', { detail: fallo })}</p>}

      <div className={s.pie}>
        <Button kind="cancel" onClick={onCerrar} />
        <Button kind="confirm" onClick={guardarYCerrar} ocupado={guardando} />
      </div>
    </Modal>
  )
}
