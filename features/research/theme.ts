'use client'
import type { CSSProperties } from 'react'
import { useApp } from '@/shared/context/AppContext'

// Tema de Research. Antes era un const fijo claro (RESEARCH_THEME); ahora deriva
// de los tokens de la app (dark-aware vía useApp/getTheme) para que el contenido
// de Research siga el toggle claro/oscuro. Agrega selectStyle, propio de Research.
export function useResearchTheme() {
  const { bg, s1, s2, s3, border, t1, t2, t3, accent, inputStyle } = useApp()
  const selectStyle: CSSProperties = { ...inputStyle, width: 'auto', padding: '6px 12px', fontSize: 12 }
  return { bg, s1, s2, s3, border, t1, t2, t3, accent, inputStyle, selectStyle }
}
