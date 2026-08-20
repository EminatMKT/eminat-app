import type { ReactNode } from 'react'
import s from '@/shared/components/ui/Field/index.module.css'

// Un campo de formulario: su rótulo y su control. El asterisco de obligatorio lo pone el
// componente, así que no se escribe a mano en cada formulario ni se olvida en uno.
type Props = {
  label: string
  required?: boolean
  grande?: boolean
  children: ReactNode
}

export default function Field({ label, required = false, grande = false, children }: Props) {
  return (
    <label className={`${s.campo} ${grande ? s.grande : ''}`}>
      <span className={s.label}>{label}{required && <span className={s.obligatorio}> *</span>}</span>
      {children}
    </label>
  )
}
