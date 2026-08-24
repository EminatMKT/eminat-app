import type { CSSProperties } from 'react'
import { RESEARCH_THEME } from '../../theme'

// Preview del email (header indigo + párrafos del contenido + footer opcional).
// Compartido por el wizard de envío (size lg + footer) y el modal de vista (size sm).
type Props = { contenido?: string; size?: 'sm' | 'lg'; footer?: boolean; style?: CSSProperties }

export default function EmailPreview({ contenido, size = 'lg', footer = false, style }: Props) {
  const { border } = RESEARCH_THEME
  const lg = size === 'lg'
  return (
    <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', ...style }}>
      <div style={{ background: '#4F46E5', padding: lg ? '18px 24px' : '14px 20px', textAlign: 'center' }}>
        <div style={{ color: 'white', fontSize: lg ? 16 : 14, fontWeight: 700 }}>Eminat Research Group</div>
      </div>
      <div style={{ padding: lg ? '24px' : '20px', background: '#FFFFFF' }}>
        {contenido ? contenido.split('\n').map((p, i) => (
          <p key={i} style={{ color: '#374151', fontSize: lg ? 14 : 13, lineHeight: 1.7, margin: lg ? '0 0 12px' : '0 0 10px' }}>{p}</p>
        )) : <p style={{ color: '#9CA3AF', fontSize: lg ? 14 : undefined }}>(no content)</p>}
      </div>
      {footer && (
        <div style={{ padding: '14px 24px', background: '#F9FAFB', textAlign: 'center', fontSize: 10, color: '#9CA3AF', borderTop: `1px solid ${border}` }}>
          Eminat Research Group — Clinical Research Operations
        </div>
      )}
    </div>
  )
}
