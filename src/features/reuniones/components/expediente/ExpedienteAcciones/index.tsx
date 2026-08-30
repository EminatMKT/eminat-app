'use client'
import { Button } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'

// centinela-exime: bloques-similares@2 — leí `ls src/shared/components/ui` (21). Son dos
// `Button` compartidos dentro del `footer` del `Modal`, que ya los alinea: no hay markup nuevo.
// Lo más cerca es `ActivityAcciones` de Stratix, que hace lo mismo para su formulario y trae su
// dominio adentro (lee `useStratix()`). Unificarlas pediría pasarle los cuatro rótulos por prop,
// que es justo lo que la regla del contenedor compartido prohíbe.

type Props = {
  /** Editar PISA lo guardado, así que pregunta antes; crear no (rules/ui.md). El rótulo cambia
   *  con lo mismo: "Crear" y "Guardar cambios" no son la misma promesa. */
  editando: boolean
  guardando: boolean
  onCancelar: () => void
  onGuardar: () => void
}

export default function ExpedienteAcciones({ editando, guardando, onCancelar, onGuardar }: Props) {
  const { t } = useT()

  return (
    <>
      <Button kind="cancel" onClick={onCancelar} />
      <Button kind="confirm" onClick={onGuardar} ocupado={guardando}
        label={editando ? t('common.saveChanges') : undefined} />
    </>
  )
}
