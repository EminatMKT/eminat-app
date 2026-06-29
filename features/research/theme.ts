import type { CSSProperties } from 'react'

// El área de contenido de Research usa SIEMPRE tema claro (independiente del dark de la app).
export const RESEARCH_THEME = {
  bg: '#F9FAFB',
  s1: '#FFFFFF',
  s2: '#FFFFFF',
  border: '#E5E7EB',
  t1: '#111827',
  t2: '#6B7280',
  t3: '#9CA3AF',
  accent: '#7C6FF7',
}

export const inputStyle: CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827', fontSize: 13, fontFamily: 'DM Sans', outline: 'none' }

export const selectStyle: CSSProperties = { ...inputStyle, width: 'auto', padding: '6px 12px', fontSize: 12 }
