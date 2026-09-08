'use client'
// centinela-exime: bloques-similares@3 — ES la unificación: guardar una vista y renombrarla son
// el mismo bloque (un `<input>` y un `Button` adentro del `Dropdown` compartido). Busqué en `ui/`:
// `Field` es de formularios con rótulo y validación, `ListToolbar` un encabezado con buscador.

// centinela-exime: identificador-en-espanol@2 — `rotulo` e `inicial` son los nombres que ya usa
// `Dropdown`, de donde bajan. Traducirlos sólo acá deja dos idiomas en la misma línea; el motor
// de filtros se renombra entero o no se renombra.
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, Dropdown } from '@/shared/components/ui'
import s from './index.module.css'

type Props = {
  /** Lo que se lee en el disparador: «Guardar vista», «Guardar como nueva», o el ✏️ de una fila. */
  rotulo: string
  /** Cómo se llama el disparador cuando el rótulo es un ícono y no se puede leer. Con él, el
   *  disparador pierde su caja: en una fila de menú es un hermano del ★ y el 🗑, no un control. */
  ariaLabel?: string
  /** Con qué texto abre el campo. Vacío al crear; el nombre actual al renombrar — renombrar es
   *  CORREGIR un nombre, y arrancar en blanco obliga a reescribirlo entero por una letra. */
  inicial?: string
  onConfirmar: (nombre: string) => Promise<void>
}

export default function NombreVista({ rotulo, ariaLabel, inicial = '', onConfirmar }: Props) {
  const { t } = useT()
  const [nombre, setNombre] = useState(inicial)

  const confirmar = async () => {
    const limpio = nombre.trim()
    if (!limpio) return
    await onConfirmar(limpio)
    // Al crear se vacía para el próximo; al renombrar el campo YA es el nombre nuevo, así que
    // volver a `inicial` lo dejaría mostrando el viejo.
    setNombre(inicial ? limpio : '')
  }

  return (
    <Dropdown rotulo={rotulo} ariaLabel={ariaLabel} iconOnly={!!ariaLabel}>
      <div className={s.form}>
        <input className={s.input} value={nombre} placeholder={t('common.filter.saveName')}
          onChange={e => setNombre(e.target.value)} />
        {/* Deshabilitado con el nombre en blanco: el CHECK `vista_nombre_no_vacio` lo rechazaría
            en la base, y un error de Postgres no es forma de decir «poné un nombre». */}
        <Button kind="confirm" label={t('common.filter.saveDo')} deshabilitado={!nombre.trim()}
          onClick={() => void confirmar()} />
      </div>
    </Dropdown>
  )
}

// Ponerle nombre a una vista: al crearla o al corregirlo después. El formulario va adentro de un
// desplegable y NO en un `prompt()`: el modal del navegador bloquea el hilo, no se puede traducir
// y no hay forma de probarlo.
