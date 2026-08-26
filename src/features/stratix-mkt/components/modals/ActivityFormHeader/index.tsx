'use client'
import { useT } from '@/shared/i18n'
import s from './index.module.css'

// Encabezado del formulario de tarea. Lo único que cambia entre crear y editar es el texto, y
// vive acá —y no en el `header={}` del modal— porque ahí sus líneas competían con el formulario.
type Props = {
  editando: boolean
  onCerrar: () => void
}

export default function ActivityFormHeader({ editando, onCerrar }: Props) {
  const { t } = useT()
  return (
    <div className={s.head}>
      <div>
        <div className={s.titulo}>{editando ? t('stratix.edit.title') : t('stratix.new.title')}</div>
        <div className={s.sub}>{editando ? t('stratix.edit.sub') : t('stratix.new.sub')}</div>
      </div>
      <button type="button" className={s.cerrar} onClick={onCerrar}>✕</button>
    </div>
  )
}
