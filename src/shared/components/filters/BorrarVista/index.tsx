'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, ConfirmModal } from '@/shared/components/ui'

type Props = {
  vistaId: string
  /** El nombre se muestra en la pregunta: «¿Borrar Mi trimestre?» dice qué se va; «¿Borrar la
   *  vista?» obliga a mirar el desplegable para saberlo, justo antes de perderla. */
  nombre: string
  onBorrar: (id: string) => Promise<void>
}

// Borrar una vista guardada, CON su confirmación. Sale aparte del resto de las acciones para que
// el botón y el diálogo estén en el mismo archivo: la regla pide que la confirmación esté a la
// vista de quien lee el borrado, que es exactamente donde uno la busca.
//
// Nació de un bug propio: este botón borraba al primer clic. El check de la regla no lo agarró
// porque mira `.tsx` que digan `DELETE` o `Repo.remove`, y acá el borrado viajaba por un prop
// hasta un `.ts` — un punto ciego, no un descuido del que lo escribió.
//
// Sin `confirmPhrase`: una vista se rehace en un minuto poniendo los filtros de nuevo y
// guardándola. La frase se reserva para lo que no se puede deshacer Y afecta a otros.
export default function BorrarVista({ vistaId, nombre, onBorrar }: Props) {
  const { t } = useT()
  const [preguntando, setPreguntando] = useState(false)
  return (
    <>
      <Button kind="delete" label={t('common.filter.delete')} onClick={() => setPreguntando(true)} />
      {preguntando && (
        <ConfirmModal destructive title={t('common.filter.deleteTitle')}
          message={t('common.filter.deleteMsg', { nombre })}
          confirmLabel={t('common.filter.delete')}
          onConfirm={() => onBorrar(vistaId)} onClose={() => setPreguntando(false)} />
      )}
    </>
  )
}
