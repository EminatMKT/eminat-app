import { useApp } from '@/shared/context/AppContext'

// Los mismos colores que las variables `--c-*` de globals.css, en JS. Existen sólo para los
// archivos que todavía pintan con `style={}`; el día que no quede ninguno, esto se borra.
// `features/research/theme.ts` los re-exporta como useResearchTheme.
//
// Hook (no constante): sigue el toggle claro/oscuro vía los tokens de AppContext. Los nueve
// campos de base son derivados de ahí, la paleta se cambia en un solo lugar
// (`shared/theme/tokens.ts`).
export function useDashboardTheme() {
  const { bg, s1, s2, s3, border, t1, t2, t3, accent, inputStyle } = useApp()
  return { bg, s1, s2, s3, border, t1, t2, t3, accent, inputStyle, warn: '#FBBF24' }
}

// Paleta por defecto de las series sin color propio. `features/research/constants.ts` la
// re-exporta como CHART_COLORS y deriva de ella los colores de etapa.
export const CHART_COLORS = ['#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#FBB040', '#F87171', '#7C6FF7', '#FB923C', '#22D3EE', '#9494B3']
