// Tokens del lenguaje visual de los TABLEROS (no de los módulos operativos).
//
// Un tablero se proyecta: se mira de lejos, en una sala, y por eso va SIEMPRE en claro,
// independiente del dark de la app. Nació en Research —de ahí los valores— y se subió acá
// cuando Stratix pidió el mismo lenguaje para su Overview: una cosa es el tablero y otra la
// producción. `features/research/theme.ts` re-exporta estos tokens como RESEARCH_THEME, así
// que Research sigue leyendo lo mismo por su nombre de siempre.
export const DASHBOARD_THEME = {
  bg: '#F9FAFB',
  s1: '#FFFFFF',
  s2: '#FFFFFF',
  border: '#E5E7EB',
  t1: '#111827',
  t2: '#6B7280',
  t3: '#9CA3AF',
  accent: '#7C6FF7',
  warn: '#FBBF24', // ámbar de aviso (ej. valores de import sin reconocer)
}

// Paleta por defecto de las series sin color propio. `features/research/constants.ts` la
// re-exporta como CHART_COLORS y deriva de ella los colores de etapa.
// ponytail: `features/cobranzas/constants.ts` tiene su propia copia de 8 colores; unificar
// cuando alguien toque ese módulo, no antes — hoy nadie comparte gráficas con Cobranzas.
export const CHART_COLORS = ['#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#FBB040', '#F87171', '#7C6FF7', '#FB923C', '#22D3EE', '#9494B3']
