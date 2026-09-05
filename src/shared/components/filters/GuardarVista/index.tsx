'use client'
// centinela-exime: bloques-similares@2 — es un `<input>` + `Button` adentro del `Dropdown`
// compartido. Busqué en `ui/`: `Field` es de formularios con rótulo y validación, y `ListToolbar`
// es un encabezado de lista con buscador. Nada cubre «un nombre y guardar» en un desplegable.
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, Dropdown } from '@/shared/components/ui'
import s from './index.module.css'

type Props = {
  onGuardar: (nombre: string) => Promise<void>
}

// Guardar la combinación actual como una vista nueva. El formulario va adentro de un desplegable
// y NO en un `prompt()`: el modal del navegador bloquea el hilo, no se puede traducir y no hay
// forma de probarlo.
export default function GuardarVista({ onGuardar }: Props) {
  const { t } = useT()
  const [nombre, setNombre] = useState('')

  const guardar = async () => {
    const limpio = nombre.trim()
    if (!limpio) return
    await onGuardar(limpio)
    setNombre('')
  }

  return (
    <Dropdown rotulo={t('common.filter.save')}>
      <div className={s.form}>
        <input className={s.input} value={nombre} placeholder={t('common.filter.saveName')}
          onChange={e => setNombre(e.target.value)} />
        {/* Deshabilitado con el nombre en blanco: el CHECK `vista_nombre_no_vacio` lo rechazaría
            en la base, y un error de Postgres no es forma de decir «poné un nombre». */}
        <Button kind="confirm" label={t('common.filter.saveDo')} deshabilitado={!nombre.trim()}
          onClick={() => void guardar()} />
      </div>
    </Dropdown>
  )
}
