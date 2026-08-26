'use client'
import type { CSSProperties } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import { ESTADO_COLORS, estadoLabel } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import EditButton from '@/shared/components/ui/EditButton'
import DeleteButton from '@/shared/components/ui/DeleteButton'
import type { Actividad } from '@/features/stratix-mkt/types'
import s from './index.module.css'

// El encabezado de la ficha: acá el título va DEBAJO de los chips de marca y estado, que es lo
// primero que se mira al abrir una tarea, y las acciones van arriba a la derecha para que estén
// a mano sin scrollear. Es un componente y no JSX dentro del `header={}` del modal porque tiene
// estructura, estilos y datos propios — ahí adentro, sus quince líneas tapaban el resto.
type Props = {
  act: Actividad
  onEditar: () => void
  onBorrar: () => void
  onCerrar: () => void
}

export default function ActivityDetailHeader({ act, onEditar, onBorrar, onCerrar }: Props) {
  const { t } = useT()
  const { colorMarca } = useApp()

  const vars = {
    '--marca': colorMarca[act.empresa ?? ''] ?? COLOR_MARCA_FALLBACK,
    '--estado': ESTADO_COLORS[act.estado ?? ''] || 'var(--c-t3)',
  } as CSSProperties

  return (
    <div className={s.head} style={vars}>
      <div className={s.headTop}>
        <div className={s.chips}>
          <span className={s.chipMarca}>{act.empresa}</span>
          <span className={s.chipEstado}>{estadoLabel(act.estado, t)}</span>
        </div>
        <div className={s.acciones}>
          <EditButton onClick={onEditar} />
          <DeleteButton onClick={onBorrar} />
          <button type="button" className={s.cerrar} onClick={onCerrar}>✕</button>
        </div>
      </div>
      <div className={s.titulo}>{act.titulo}</div>
    </div>
  )
}
