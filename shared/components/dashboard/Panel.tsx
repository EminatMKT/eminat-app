'use client'
import type { ReactNode } from 'react'
import { DASHBOARD_THEME } from './theme'
import { useUserPreference } from '@/shared/lib/useUserPreference'

// Contenedor único de los bloques del módulo (gráficas, tabla de leads, barra de filtros).
// Antes cada bloque repetía su propio borde/radio/sombra y su título con otro tamaño: un panel
// solo hace que todo el módulo respire igual y que el ojo encuentre siempre el título en el
// mismo lugar. `right` es para lo que acompaña al título (contadores, acciones).
// `collapsible` deja recoger el bloque: en una presentación se muestra una sección a la vez.
type PanelBase = {
  title?: string
  right?: ReactNode
  children: ReactNode
  flush?: boolean // el contenido llega hasta el borde (tablas), sin padding propio
}
// Plegable ⇒ `persistKey` OBLIGATORIO, por tipos. Un panel que se recoge y se vuelve a abrir solo
// al recargar es una molestia silenciosa; así el compilador no deja agregar uno sin memoria.
// La clave es explícita y no derivada del título: el título está traducido y cambiaría de clave
// (y de estado) al pasar de español a inglés.
type PanelProps = PanelBase & (
  | { collapsible: true; persistKey: string }
  | { collapsible?: false; persistKey?: never }
)

export default function Panel({ title, right, children, flush = false, collapsible = false, persistKey }: PanelProps) {
  const { s1, border, t1, t3 } = DASHBOARD_THEME
  const [collapsed, setCollapsed] = useUserPreference(persistKey ? `panel-${persistKey}` : null, false)
  const canToggle = collapsible && !!title
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 16px', borderBottom: collapsed ? 'none' : `1px solid ${border}` }}>
          {/* El título entero es el disparador, no solo el chevron: es un blanco más grande. */}
          <button type="button" onClick={() => canToggle && setCollapsed(c => !c)} aria-expanded={canToggle ? !collapsed : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0, border: 'none', background: 'transparent', cursor: canToggle ? 'pointer' : 'default' }}>
            {canToggle && <span style={{ color: t3, fontSize: 10, width: 10, display: 'inline-block', transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .15s ease' }}>▼</span>}
            <span style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 700, color: t1, letterSpacing: '-.01em' }}>{title}</span>
          </button>
          {right}
        </div>
      )}
      {!collapsed && <div style={{ padding: flush ? 0 : 16 }}>{children}</div>}
    </div>
  )
}
