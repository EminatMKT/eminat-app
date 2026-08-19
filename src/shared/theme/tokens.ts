import type { CSSProperties } from 'react'

// Tokens de tema de la app. Hoy FIJOS (claro): el área de contenido siempre es
// clara; el dark del sidebar/topbar lo maneja AppShell. El estado `dark` de
// AppContext aún no se propaga a estos tokens — ver TODO "toggle claro/oscuro".
export const THEME = {
  bg: '#F9FAFB',
  s1: '#FFFFFF',
  s2: '#FFFFFF',
  s3: '#F3F4F6',
  border: '#E5E7EB',
  t1: '#111827',
  t2: '#6B7280',
  t3: '#9CA3AF',
  accent: '#7C6FF7',
}

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: '#111827',
  fontSize: 13,
  fontFamily: 'DM Sans',
  outline: 'none',
}
