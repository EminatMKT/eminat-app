'use client'
import { Button } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'

// centinela-exime: bloques-similares@2 — no hay markup nuevo: son dos `Button` compartidos. Lo
// propio de acá son los cuatro rótulos que cambian entre crear y editar, y eso es dominio de
// Stratix — un pie compartido tendría que recibirlos por prop, que es justo lo que la regla del
// contenedor prohíbe.

// El pie del formulario de tarea. Va dentro del `footer` del Modal, que ya lo alinea.
type Props = {
  onGuardar: () => void
}

export default function ActivityAcciones({ onGuardar }: Props) {
  const { t } = useT()
  const { nuevaAct, creandoAct, actEditando, cerrarFormAct } = useStratix()

  return (
    <>
      <Button kind="cancel" label={t('common.cancel2')} onClick={cerrarFormAct} />
      {/* Deshabilitado SIN título: es el único campo sin el cual la tarjeta del Kanban no se
          puede leer. Los demás obligatorios los valida el guardado, con su mensaje. */}
      <Button kind="confirm" onClick={onGuardar} ocupado={creandoAct}
        deshabilitado={!nuevaAct.titulo.trim()}
        label={actEditando ? t('common.saveChanges') : t('stratix.new.create')}
        ocupadoLabel={actEditando ? t('common.processing') : t('stratix.new.creating')} />
    </>
  )
}
