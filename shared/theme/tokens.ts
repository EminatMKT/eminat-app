import type { CSSProperties } from 'react'

// Tokens de tema del área de contenido. El toggle (AppShell) cambia `dark` en
// AppContext y AppProvider arma los tokens con getTheme(dark). El sidebar/topbar
// son siempre oscuros (constantes `D` en AppShell), eso es parte del diseño.
//
// Nota: research (RESEARCH_THEME fijo) y accounting (Tailwind claro) todavía no
// consumen estos tokens, así que en modo oscuro siguen claros — ver TODO de
// reconciliación de tema.

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

const LIGHT: Theme = {
  bg: '#EEF1F6',      // fondo de página gris claro: las cards blancas resaltan
  s1: '#FFFFFF',      // cards / superficie principal
  s2: '#FFFFFF',      // superficie principal alterna (kanban, theads): blanca para resaltar sobre bg
  s3: '#EDF0F5',      // gris sutil (tracks, fills, badges)
  border: '#DDE3EC',  // borde algo más definido para delimitar cards
  t1: '#111827',
  t2: '#6B7280',
  t3: '#9CA3AF',
  accent,
  inputStyle: { ...baseInput, border: '1px solid #D4DAE3', background: '#FFFFFF', color: '#111827' },
}

// Paleta tomada del home/Launchpad (app/(app)/page.tsx, constante `D`) para que
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
// y sumala acá + al THEME_ORDER. Los componentes no se tocan (consumen tokens
// semánticos vía useApp). El selector (AppShell) cicla THEME_ORDER.
export type ThemeName = 'light' | 'dark'

export const THEMES: Record<ThemeName, Theme> = {
  light: LIGHT,
  dark: DARK,
}

// Orden para el selector/ciclo de temas.
export const THEME_ORDER: ThemeName[] = ['light', 'dark']

export function getTheme(name: ThemeName): Theme {
  return THEMES[name] ?? THEMES.light
}
