'use client'
import type { CSSProperties } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import s from './index.module.css'

// Una tarea en curso dentro de la tarjeta de disponibilidad: el punto de la marca y el título.
export default function ActiveTaskLine({ empresa, titulo }: { empresa: string; titulo: string }) {
  const { colorMarca } = useApp()
  return (
    <div className={s.linea} style={{ '--marca': colorMarca[empresa] ?? COLOR_MARCA_FALLBACK } as CSSProperties}>
      <span className={s.punto}>●</span>{titulo}
    </div>
  )
}
