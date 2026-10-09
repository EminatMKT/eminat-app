import type { CSSProperties } from 'react'

// Research sigue el toggle claro/oscuro de la app (antes usaba siempre claro). Los tokens
// viven en shared/components/dashboard/theme.ts desde que Stratix pidió el mismo lenguaje
// para su tablero; acá se re-exportan con el nombre que usan los ~40 archivos de Research.
// Los estilos de formulario de abajo NO son de tablero y se quedan.
export { useDashboardTheme as useResearchTheme } from '@/shared/components/dashboard/theme'

export const inputStyle: CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827', fontSize: 13, fontFamily: 'DM Sans', outline: 'none' }

export const selectStyle: CSSProperties = { ...inputStyle, width: 'auto', padding: '6px 12px', fontSize: 12 }
