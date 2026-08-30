'use client'
import { useState } from 'react'
import { Button } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — leí `ls src/shared/components/ui` (21). El más cerca es
// `SolicitantePicker` de Stratix, y trae su dominio adentro: ofrece inactivos deshabilitados y
// sabe de `solicitante_id`. Acá el `<select>` es de una línea y lo que importa es a QUIÉN ofrece,
// que lo decide el panel. `Button` sí se reusa.

type Props = {
  /** Los del equipo que todavía no están en la mesa. Lo calcula el panel: el UNIQUE de la base
   *  rechazaría al repetido, pero ofrecerlo y que falle es peor que no ofrecerlo. */
  disponibles: { id: string; nombre: string }[]
  onAgregar: (usuarioId: string) => void
}

export default function InternoPicker({ disponibles, onAgregar }: Props) {
  const { t } = useT()
  const [elegido, setElegido] = useState('')

  function agregar() {
    onAgregar(elegido)
    setElegido('')
  }

  return (
    <div className={s.linea}>
      {/* Arranca en el placeholder: sin él, el navegador pinta al primero de la lista mientras
          el estado sigue vacío, que es el bug de "New task" (rules/ui.md). */}
      <select className={s.select} aria-label={t('reuniones.participantes.delEquipo')}
        value={elegido} onChange={e => setElegido(e.target.value)}>
        <option value="">{t('common.select')}</option>
        {disponibles.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
      </select>
      <Button kind="new" label={t('reuniones.participantes.agregar')}
        onClick={agregar} deshabilitado={!elegido} />
    </div>
  )
}
