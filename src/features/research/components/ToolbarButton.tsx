import type { ReactNode } from 'react'
import { RESEARCH_THEME } from '../theme'

// Botón de la barra de acciones del módulo. Existe para que las cuatro acciones dejen de repetir
// su estilo inline (y de divergir: antes el primario medía 12px y los otros 11).
// `icon` va aparte del texto para que el emoji no se pegue al label ni herede su peso.
export default function ToolbarButton({ icon, children, onClick, primary = false }: {
  icon?: string
  children: ReactNode
  onClick: () => void
  primary?: boolean
}) {
  const { s1, border, t2, accent } = RESEARCH_THEME
  return (
    <button onClick={onClick} className="tool-btn" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      border: primary ? '1px solid transparent' : `1px solid ${border}`,
      background: primary ? accent : s1,
      color: primary ? '#FFFFFF' : t2,
      boxShadow: primary ? '0 1px 2px rgba(124,111,247,.35)' : 'none',
    }}>
      {icon && <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>}
      {children}
    </button>
  )
}
