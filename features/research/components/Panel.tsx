import type { ReactNode } from 'react'
import { RESEARCH_THEME } from '../theme'

// Contenedor único de los bloques del módulo (gráficas, tabla de leads, barra de filtros).
// Antes cada bloque repetía su propio borde/radio/sombra y su título con otro tamaño: un panel
// solo hace que todo el módulo respire igual y que el ojo encuentre siempre el título en el
// mismo lugar. `right` es para lo que acompaña al título (contadores, acciones).
export default function Panel({ title, right, children, flush = false }: {
  title?: string
  right?: ReactNode
  children: ReactNode
  flush?: boolean // el contenido llega hasta el borde (tablas), sin padding propio
}) {
  const { s1, border, t1 } = RESEARCH_THEME
  return (
    <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 16px', borderBottom: `1px solid ${border}` }}>
          <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 700, color: t1, letterSpacing: '-.01em' }}>{title}</div>
          {right}
        </div>
      )}
      <div style={{ padding: flush ? 0 : 16 }}>{children}</div>
    </div>
  )
}
