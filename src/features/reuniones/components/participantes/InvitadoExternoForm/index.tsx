'use client'
import { useState, type ChangeEvent } from 'react'
import { Button, Field } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import type { Externo } from '@/features/reuniones/types'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — leí `ls src/shared/components/ui` (21). `Field` y
// `Button` se reusan tal cual; lo propio son los tres campos y que el alta se habilite con el
// nombre. No hay un formulario compartido al que agregarle un prop: cada uno es su pantalla.

const VACIO: Externo = { nombre: '', empresa: '', email: '' }

type Props = {
  onAgregar: (externo: Externo) => void
}

// El correo entra ACÁ y no cuando se envíe el acta (§3.2 del diseño): el acta congela a los
// participantes, así que después no habría de dónde sacarlo sin volver a preguntar.
export default function InvitadoExternoForm({ onAgregar }: Props) {
  const { t } = useT()
  const [externo, setExterno] = useState<Externo>(VACIO)
  const { nombre, empresa, email } = externo
  const set = (k: keyof Externo) => (e: ChangeEvent<HTMLInputElement>) =>
    setExterno(p => ({ ...p, [k]: e.target.value }))

  function agregar() {
    onAgregar(externo)
    setExterno(VACIO)
  }

  return (
    <div className={s.caja}>
      <div className={s.tres}>
        <Field label={t('reuniones.campo.invitadoNombre')} required>
          <input value={nombre} placeholder={t('reuniones.ph.invitadoNombre')} onChange={set('nombre')} />
        </Field>
        <Field label={t('reuniones.campo.invitadoEmpresa')}>
          <input value={empresa} placeholder={t('reuniones.ph.invitadoEmpresa')} onChange={set('empresa')} />
        </Field>
        <Field label={t('common.email')}>
          <input type="email" value={email} onChange={set('email')} />
        </Field>
      </div>
      {/* Deshabilitado sin nombre: es lo único que la base exige de un externo. */}
      <Button kind="new" label={t('reuniones.participantes.agregar')}
        onClick={agregar} deshabilitado={!nombre.trim()} />
    </div>
  )
}
