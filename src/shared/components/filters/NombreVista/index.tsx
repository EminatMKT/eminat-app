'use client'
// centinela-exime: bloques-similares@2 — ES la unificación: guardar una vista y renombrarla son
// el mismo bloque (un `<input>` y un `Button` adentro del `Dropdown` compartido) y estaban por
// duplicarse. Busqué en `ui/`: `Field` es de formularios con rótulo y validación, y `ListToolbar`
// es un encabezado de lista con buscador. Nada cubre «un nombre y confirmar» en un desplegable.
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, Dropdown } from '@/shared/components/ui'
import s from './index.module.css'

type Props = {
  /** Lo que se lee en el disparador: «Guardar vista», «Guardar como nueva», «Renombrar». */
  rotulo: string
  /** Con qué texto abre el campo. Vacío al crear; el nombre actual al renombrar — renombrar es
   *  CORREGIR un nombre, y arrancar en blanco obliga a reescribirlo entero para cambiar una letra. */
  inicial?: string
  onConfirmar: (nombre: string) => Promise<void>
}

// Ponerle nombre a una vista: al crearla o al corregirlo después. El formulario va adentro de un
// desplegable y NO en un `prompt()`: el modal del navegador bloquea el hilo, no se puede traducir
// y no hay forma de probarlo.
export default function NombreVista({ rotulo, inicial = '', onConfirmar }: Props) {
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
    <Dropdown rotulo={rotulo}>
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
