'use client'
import { useT } from '@/shared/i18n'
import s from './index.module.css'

// El aviso de "estoy trayendo esto" para una vista que se carga con `next/dynamic`.
//
// El nombre hace pareja con `LoadingScreen` del shell, y la diferencia es el alcance: aquél
// ocupa `100vh` sobre el fondo oscuro y es para ANTES del shell, mientras AppContext resuelve
// el perfil. Éste va DENTRO del área de contenido, que ya está pintada, así que sólo ocupa el
// alto de una tarjeta y usa los colores del contenido claro.
export default function LoadingView() {
  const { t } = useT()
  return <div className={s.caja}>{t('common.loading')}</div>
}
