'use client'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import s from './index.module.css'

type Props = {
  busqueda: string
  setBusqueda: (v: string) => void
  action?: ReactNode
  /** Filtros extra (chips). Ocupan el espacio libre entre el buscador y la acción. */
  children?: ReactNode
}

// centinela-exime: bloques-similares@3 — la otra fila de encabezado del repo es `FilterBar`, y
// comparten cuatro declaraciones de flex y nada más: acá hay buscador y acción, allá un control
// por def, y hasta el gap difiere. La unificación que valía la pena era sacar las dos del `style`
// inline, y eso está hecho — la fila en sí no da para un módulo compartido.

// Encabezado común de las listas de administración: buscador a la izquierda,
// filtros opcionales al medio y la acción de alta a la derecha. Antes cada vista
// resolvía esto por su cuenta — Usuarios tenía buscador y el botón en otra fila,
// Roles y los catálogos no tenían buscador.
//
// Ya no lee el contexto. Pedía `useApp()` para un solo objeto de estilo, así que un componente
// de presentación se volvía imposible de montar fuera del provider por una cuestión de padding.
export default function ListToolbar({ busqueda, setBusqueda, action, children }: Props) {
  const { t } = useT()
  return (
    <div className={s.fila}>
      <input type="text" placeholder={t('common.search')} value={busqueda} className={s.busqueda}
        onChange={e => setBusqueda(e.target.value)} />
      {children}
      <div className={s.accion}>{action}</div>
    </div>
  )
}
