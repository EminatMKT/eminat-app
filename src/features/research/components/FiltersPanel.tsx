'use client'
import { RESEARCH_THEME, selectStyle } from '../theme'
import { useT, type I18nKey } from '@/shared/i18n'
import FilterBar from '@/shared/components/ui/FilterBar'
import { LEAD_FILTERS } from '../utils/filters'
import { useResearch } from './ResearchContext'
import Panel from '@/shared/components/dashboard/Panel'

// Panel de filtros del módulo, compartido por la tabla de leads Y el dashboard: los dos leen el
// MISMO `filterValues` del contexto, así que filtrar en un lado se ve en el otro. Está extraído
// en vez de duplicado porque dos copias derivarían — y "el dashboard filtra distinto que la
// tabla" es un bug que nadie nota hasta que los números no cierran en una presentación.
//
// El conteo de activos va en la CABECERA del panel a propósito: los filtros se recuerdan entre
// sesiones, así que si el panel quedó recogido, este chip es lo ÚNICO que explica por qué las
// cifras del tablero no son las del pipeline completo.
export default function FiltersPanel() {
  const { border, t2, t3, accent } = RESEARCH_THEME
  const { t } = useT()
  const { leads, filterValues, setFilterValue, clearFilters } = useResearch()
  const activos = LEAD_FILTERS.filter(d => filterValues[d.key]).length
  return (
    <Panel collapsible persistKey="research-filters" title={t('research.section.filters')}
      right={activos > 0
        ? <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: accent, background: `${accent}14`, borderRadius: 999, padding: '4px 10px' }}>
            {t('research.filter.activeCount', { n: activos })}
          </span>
        : undefined}>
      {/* `items={leads}` y no los filtrados: las opciones de cada desplegable salen del total,
          si no, al elegir un sponsor desaparecerían los demás y no se podría cambiar. */}
      <FilterBar defs={LEAD_FILTERS} items={leads} values={filterValues} onChange={setFilterValue} onClear={clearFilters}
        labelFor={d => t(d.labelKey as I18nKey)}
        clearLabel={t('research.filter.clear')}
        resultsLabel="" /* el conteo vive en la cabecera de la tabla, no repetido acá */
        selectStyle={selectStyle} mutedColor={t3}
        clearStyle={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 11, cursor: 'pointer' }} />
    </Panel>
  )
}
