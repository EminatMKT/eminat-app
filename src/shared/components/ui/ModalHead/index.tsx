'use client'
import { useT } from '@/shared/i18n'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — no es markup nuevo: sale de `Modal`, que ya lo tenía
// adentro, y absorbe a `ActivityFormHeader` (Stratix), que reimplementaba lo mismo con el título
// en 20px contra los 18px del Modal. O sea que ya había dos copias divergiendo. Se extrae para
// que `Modal` entre en su límite y para que el subtítulo exista una sola vez.

// El encabezado por defecto de un modal: su título, su bajada opcional y la ✕.
type Props = {
  title?: string
  subtitle?: string
  onClose: () => void
}

export default function ModalHead({ title, subtitle, onClose }: Props) {
  const { t } = useT()
  return (
    <div className={s.fila}>
      <div>
        <div className={s.titulo}>{title}</div>
        {subtitle && <div className={s.sub}>{subtitle}</div>}
      </div>
      {/* `aria-label`: la ✕ sola no le dice nada a un lector de pantalla. */}
      <button type="button" className={s.cerrar} onClick={onClose} aria-label={t('common.close')}>✕</button>
    </div>
  )
}
