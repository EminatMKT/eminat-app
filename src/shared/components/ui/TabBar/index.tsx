import type { ReactNode } from 'react'
import s from './index.module.css'

// Contenedor de las pestañas de una sección. Los TabButton van adentro.
export default function TabBar({ children }: { children: ReactNode }) {
  return <div className={s.bar}>{children}</div>
}
