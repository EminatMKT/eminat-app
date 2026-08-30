'use client'
import type { CSSProperties } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import ColorBadge from '@/shared/components/ui/ColorBadge'
import { ESTADO_REUNION, MODALIDAD } from '@/features/reuniones/constants'
import type { Reunion } from '@/features/reuniones/types'
import s from './index.module.css'

// centinela-exime: bloques-similares@1 — busqué en src/shared/components/ui una fila de lista
// genérica (hay ListToolbar, StatBox, ColorBadge, RowMenu, pero ninguna fila) y las filas de
// features/directorio (MemberCard) y features/admin (UserRow): las dos traen su dominio adentro
// —departamento, cargos, rol— y ninguna admite código + fecha + estado. El chip de estado SÍ se
// reusa: es ColorBadge, que ya existe. Si aparece una segunda fila con esta forma, sube a shared.

type Props = {
  reunion: Reunion
  onAbrir: (id: string) => void
}

export default function ReunionRow({ reunion, onAbrir }: Props) {
  const { colorMarca } = useApp()
  const { t, locale } = useT()
  const { id, codigo, empresa, titulo, fecha, hora_inicio, modalidad, estado } = reunion

  // La fecha se formatea desde las partes de 'YYYY-MM-DD', sin pasar por Date: `new Date(f)` la
  // interpreta como UTC y en UTC-4 muestra el día anterior (rules/codigo.md).
  const [anio, mes, dia] = fecha.split('-')
  const fechaLegible = new Date(Number(anio), Number(mes) - 1, Number(dia))
    .toLocaleDateString(locale === 'en' ? 'en-US' : 'es-EC', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <button type="button" className={s.fila} onClick={() => onAbrir(id)}
      style={{ '--marca': colorMarca[empresa] ?? 'var(--c-t3)' } as CSSProperties}>
      <span className={s.marca} aria-hidden="true" />
      <span className={s.centro}>
        <span className={s.titulo}>{titulo}</span>
        <span className={s.meta}>
          {codigo && <code className={s.codigo}>{codigo}</code>}
          <span>{fechaLegible}</span>
          {hora_inicio && <span>{hora_inicio.slice(0, 5)}</span>}
          <span>{MODALIDAD.label(modalidad, t)}</span>
        </span>
      </span>
      <ColorBadge color={ESTADO_REUNION.colores[estado]}>{ESTADO_REUNION.label(estado, t)}</ColorBadge>
    </button>
  )
}
