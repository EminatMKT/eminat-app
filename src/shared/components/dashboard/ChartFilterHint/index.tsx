'use client'
import { DASHBOARD_THEME } from '@/shared/components/dashboard/theme'
import { useT } from '@/shared/i18n'

// Aviso de que la gráfica es clickeable, en la cabecera de su panel.
//
// Sin esto el cross-filter es una función escondida: nada en un gráfico dice que se puede
// clickear, y menos que volver a clickear lo deshace. Por eso el texto cambia según el estado
// en vez de ser un cartel fijo — enseña el gesto que toca en cada momento:
//   sin selección → "Clic para filtrar"
//   con selección → el valor elegido con una ✕, que además ES el botón para quitarlo
// Así el "cómo deshago" no depende de que la persona adivine que hay que volver a clickear la
// misma barra: tiene un control explícito, y de paso el chip dice POR QUÉ el tablero muestra
// menos de lo que debería.
export default function ChartFilterHint({ label, onClear }: { label?: string; onClear: () => void }) {
  const { t } = useT()
  const { t3, accent } = DASHBOARD_THEME
  if (!label) {
    return <span style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{t('research.chart.clickToFilter')}</span>
  }
  return (
    <button onClick={onClear} title={t('research.chart.clearFilter')}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'DM Mono', fontSize: 10, color: accent, background: `${accent}14`, border: `1px solid ${accent}55`, borderRadius: 999, padding: '4px 10px', cursor: 'pointer' }}>
      {label}
      <span aria-hidden style={{ fontSize: 11, lineHeight: 1 }}>✕</span>
    </button>
  )
}
