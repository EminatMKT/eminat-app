'use client'
import { useT } from '@/shared/i18n'
import s from './index.module.css'

// Par de EditButton. El rojo NO es decorativo: es la única señal previa de que la acción es
// destructiva, y por eso sale del token --c-danger y no de cada pantalla, donde ya divergía.
// La confirmación la pone quien lo usa, con ConfirmModal.
type Props = {
  onClick: () => void
  label?: string
}

export default function DeleteButton({ onClick, label }: Props) {
  const { t } = useT()
  return (
    <button type="button" className={s.boton} onClick={onClick}>
      🗑 {label ?? t('common.delete')}
    </button>
  )
}
