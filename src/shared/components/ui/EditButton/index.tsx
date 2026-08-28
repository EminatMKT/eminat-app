'use client'
import { useT } from '@/shared/i18n'
import s from './index.module.css'

// El ✏️ y la etiqueta los pone el componente, no cada pantalla — mismo criterio que NewButton
// con su "+": el ícono escrito a mano en cada JSX es lo que se desincroniza entre vistas.
// `label` solo para cuando la acción necesita decir QUÉ edita ("Editar tarea").
type Props = {
  onClick: () => void
  label?: string
}

export default function EditButton({ onClick, label }: Props) {
  const { t } = useT()
  return (
    <button type="button" className={s.boton} onClick={onClick}>
      ✏️ {label ?? t('common.edit')}
    </button>
  )
}
