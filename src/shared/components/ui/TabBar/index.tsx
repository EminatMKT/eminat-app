import type { ReactNode } from 'react'
import s from '@/shared/components/ui/TabBar/index.module.css'

// Contenedor de las pestañas de una sección. Los TabButton van adentro.
type Props = {
  children: ReactNode
}

export default function TabBar({ children }: Props) {
  return <div className={s.bar}>{children}</div>
}
