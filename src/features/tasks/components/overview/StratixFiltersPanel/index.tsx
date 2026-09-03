'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT, type I18nKey } from '@/shared/i18n'
import FilterBar from '@/shared/components/ui/FilterBar'
import Panel from '@/shared/components/dashboard/Panel'
import { filterSelectStyle, filterClearStyle, DASHBOARD_THEME } from '@/shared/components/dashboard/theme'
import { useTasks } from '@/features/tasks/components/TasksContext'
import s from './index.module.css'

// El pegamento entre `FilterBar` (compartida, sin dominio) y las actividades de Stratix: le pasa
// los defs del módulo y las etiquetas ya traducidas. Es la contraparte del FiltersPanel de
// Research, que hace lo mismo con LEAD_FILTERS.
//
// El conteo de activos va en la CABECERA del panel a propósito: los filtros se recuerdan entre
// sesiones y el panel se puede dejar recogido, así que este chip es lo ÚNICO que explica por qué
// las cifras del tablero no son las de todo el año.
export default function StratixFiltersPanel() {
  const { t } = useT()
  const { actividades } = useApp()
  const { actFilters, filterValues, setFilterValue, clearFilters, filtrosActivos } = useTasks()
  return (
    <Panel collapsible persistKey="stratix-filtros" title={t('stratix.section.filters')}
      right={filtrosActivos > 0
        ? <span className={s.chip}>{t('stratix.filter.activeCount', { n: filtrosActivos })}</span>
        : undefined}>
      {/* `items` son TODAS las actividades y no las filtradas: las opciones de cada desplegable
          salen del total, si no, al elegir una marca desaparecerían las demás y no se podría
          cambiar sin limpiar primero. */}
      <FilterBar defs={actFilters} items={actividades} values={filterValues}
        onChange={setFilterValue} onClear={clearFilters}
        labelFor={d => t(d.labelKey as I18nKey)}
        clearLabel={t('stratix.filter.clear')}
        resultsLabel="" /* el conteo filtrado ya ES la card "Total tareas" de abajo */
        selectStyle={filterSelectStyle} clearStyle={filterClearStyle} mutedColor={DASHBOARD_THEME.t3} />
    </Panel>
  )
}
