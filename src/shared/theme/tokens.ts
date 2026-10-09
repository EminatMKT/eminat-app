import type { CSSProperties } from 'react'

// Tokens de tema del área de contenido. El toggle (ThemeToggle) cambia `theme`
// en AppContext y AppProvider arma los tokens con getTheme(theme). El
// sidebar/topbar son siempre oscuros (constante `D` en appShellConfig), eso es
// parte del diseño y no sigue el toggle.

export type Theme = {
  bg: string
  s1: string
  s2: string
  s3: string
  border: string
  t1: string
  t2: string
  t3: string
  accent: string
  inputStyle: CSSProperties
}

const accent = '#7C6FF7'

const baseInput = { width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans', outline: 'none' } as const

// Paleta claro = la app de hoy, sin tocar un solo valor (era la duda que frenó
// el PR original: acá no hay reinterpretación, son los mismos hex que tenía
// el THEME fijo de antes de este toggle).
const LIGHT: Theme = {
  bg: '#F9FAFB',
  s1: '#FFFFFF',
  s2: '#FFFFFF',
  s3: '#F3F4F6',
  border: '#E5E7EB',
  t1: '#111827',
  t2: '#6B7280',
  t3: '#9CA3AF',
  accent,
  inputStyle: { ...baseInput, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827' },
}

// Paleta tomada del home/Launchpad (constante `D` de appShellConfig) para que
// el modo oscuro sea coherente con esa pantalla. accent se mantiene #7C6FF7 (el
// que el resto de la app hardcodea) en vez del #4F46E5 del home.
const DARK: Theme = {
  bg: '#101017',
  s1: '#13131C',
  s2: '#13131C',
  s3: '#191923',
  border: 'rgba(255,255,255,0.07)',
  t1: '#FFFFFF',
  t2: 'rgba(255,255,255,0.65)',
  t3: 'rgba(255,255,255,0.35)',
  accent,
  inputStyle: { ...baseInput, border: '1px solid rgba(255,255,255,0.12)', background: '#191923', color: '#FFFFFF' },
}

// Registry de temas. Para agregar un 3er tema: definí su paleta (otro `Theme`)
// y sumala acá + a THEME_ORDER. Los componentes no se tocan (consumen tokens
// semánticos vía useApp). El toggle cicla THEME_ORDER.
export type ThemeName = 'light' | 'dark'

export const THEMES: Record<ThemeName, Theme> = {
  light: LIGHT,
  dark: DARK,
}

export const THEME_ORDER: ThemeName[] = ['light', 'dark']

export function getTheme(name: ThemeName): Theme {
  return THEMES[name] ?? THEMES.light
}
