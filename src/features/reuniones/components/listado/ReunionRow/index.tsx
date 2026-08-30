'use client'
import { ColorBadge, FilaLista } from '@/shared/components/ui'
import { fechaCorta, horaCorta } from '@/shared/utils'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import type { Reunion } from '@/features/reuniones/types'
import { ESTADO_REUNION, MODALIDAD } from '@/features/reuniones/constants'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — la caja y la barra de color SALIERON de acá a
// `FilaLista`, compartido, al aparecer la segunda fila igual (`ParticipanteRow`): esto ya no
// dibuja ninguna de las dos. Lo que queda es el contenido, que es dominio de reuniones —código,
// fecha, hora y modalidad—; y el chip es `ColorBadge`, que también se reusa.

type Props = {
  reunion: Reunion
  onAbrir: () => void
}

export default function ReunionRow({ reunion, onAbrir }: Props) {
  const { colorMarca } = useApp()
  const { t, intlLocale } = useT()
  const { codigo, empresa, titulo, fecha, hora_inicio, modalidad, estado } = reunion

  return (
    <FilaLista color={colorMarca[empresa] ?? 'var(--c-t3)'} onAbrir={onAbrir}
      etiqueta={t('reuniones.abrir', { titulo })}>
      <span className={s.centro}>
        <span className={s.titulo}>{titulo}</span>
        <span className={s.meta}>
          {codigo && <code className={s.codigo}>{codigo}</code>}
          <span>{fechaCorta(fecha, intlLocale)}</span>
          {hora_inicio && <span>{horaCorta(hora_inicio, intlLocale)}</span>}
          <span>{MODALIDAD.label(modalidad, t)}</span>
        </span>
      </span>
      <ColorBadge color={ESTADO_REUNION.colores[estado]}>{ESTADO_REUNION.label(estado, t)}</ColorBadge>
    </FilaLista>
  )
}
