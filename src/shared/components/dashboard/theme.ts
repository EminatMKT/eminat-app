import { THEME } from '@/shared/theme/tokens'

// Los mismos colores que las variables `--c-*` de globals.css, en JS. Existen sólo para los
// archivos que todavía pintan con `style={}`; el día que no quede ninguno, esto se borra.
// `features/research/theme.ts` los re-exporta como RESEARCH_THEME.
//
// ponytail: los nueve estaban COPIADOS de `shared/theme/tokens.ts`. Derivados, la paleta se
// cambia en un lugar. Si `THEME` algún día sigue al dark de la app, acá hay que fijarlos.
export const DASHBOARD_THEME = { ...THEME, warn: '#FBBF24' }

// Paleta por defecto de las series sin color propio. `features/research/constants.ts` la
// re-exporta como CHART_COLORS y deriva de ella los colores de etapa.
// ponytail: `features/cobranzas/constants.ts` tiene su propia copia de 8 colores; unificar
// cuando alguien toque ese módulo, no antes — hoy nadie comparte gráficas con Cobranzas.
export const CHART_COLORS = ['#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#FBB040', '#F87171', '#7C6FF7', '#FB923C', '#22D3EE', '#9494B3']
