'use client'
import type { ReactNode } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'

// Encabezado común de las listas de administración: buscador a la izquierda,
// filtros opcionales al medio y la acción de alta a la derecha. Antes cada vista
// resolvía esto por su cuenta — Usuarios tenía buscador y el botón en otra fila,
// Roles y los catálogos no tenían buscador.
export default function ListToolbar({ busqueda, setBusqueda, action, children }: {
  busqueda: string
  setBusqueda: (v: string) => void
  action?: ReactNode
  /** Filtros extra (chips). Ocupan el espacio libre entre el buscador y la acción. */
  children?: ReactNode
}) {
  const { inputStyle } = useApp()
  const { t } = useT()
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
      <input type="text" placeholder={t('common.search')} value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inputStyle, width: 220 }} />
      {children}
      <div style={{ marginLeft: 'auto' }}>{action}</div>
    </div>
  )
}
