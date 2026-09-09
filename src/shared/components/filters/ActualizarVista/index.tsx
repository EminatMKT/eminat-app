'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, ConfirmModal } from '@/shared/components/ui'

type Props = {
  vistaId: string
  /** El nombre va en la pregunta: «¿Actualizar Mi trimestre?» dice qué se pisa. «¿Actualizar la
   *  vista?» obliga a mirar el desplegable para saberlo, justo antes de perder lo que tenía. */
  nombre: string
  /** Apagado mientras no haya una vista puesta que hayas modificado. Va deshabilitado y NO
   *  ausente: un control que aparece cuando ya hiciste lo que había que hacer para verlo no
   *  enseña que existe. */
  deshabilitado: boolean
  onActualizar: (id: string) => Promise<void>
}

export default function ActualizarVista({ vistaId, nombre, deshabilitado, onActualizar }: Props) {
  const { t } = useT()
  const [preguntando, setPreguntando] = useState(false)
  return (
    <>
      <Button kind="confirm" label={t('common.filter.update')} deshabilitado={deshabilitado}
        onClick={() => setPreguntando(true)} />
      {preguntando && (
        <ConfirmModal title={t('common.filter.updateTitle')}
          message={t('common.filter.updateMsg', { nombre })}
          confirmLabel={t('common.filter.update')}
          onConfirm={() => onActualizar(vistaId)} onClose={() => setPreguntando(false)} />
      )}
    </>
  )
}

// Actualizar una vista guardada, CON su confirmación, y el botón y el diálogo en el mismo archivo
// — igual que `BorrarVista`, y por lo mismo: la confirmación tiene que estar a la vista de quien
// lee la acción.
//
// Pisaba la vista al primer clic. No es tan grave como borrarla —la vista sigue existiendo— pero
// se pierde igual la combinación que tenía guardada, y encima en silencio: el botón está al lado
// de los filtros, o sea a un clic de distancia de cualquiera que estuviera ajustando algo. La
// diferencia con borrar es que ahí se ve que algo desapareció; acá la vista sigue en la lista,
// con el mismo nombre y otro contenido.
//
// Sin `destructive`: no borra nada, sobrescribe. El rojo es para lo que se va y no vuelve, y
// gastarlo acá le saca peso donde sí hace falta.
