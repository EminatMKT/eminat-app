'use client'
import { useT } from '@/shared/i18n'
import Panel from '@/shared/components/dashboard/Panel'
import { ColorBadge } from '@/shared/components/ui'
import type { Filtros } from '@/shared/hooks'
import type { FilterDef } from '@/shared/utils'
import FilterBar from '../FilterBar'
import FilterPicker from '../FilterPicker'
import FilterPresets from '../FilterPresets'

// centinela-exime: familia-dispersa@2 — los otros `*Panel` son el contenedor de SU módulo
// (`SidebarPanel`, `ParticipantesPanel`); éste es el armador del motor y vive con sus piezas.
type Props<T> = {
  filtros: Filtros<T>
  items: T[]
  persistKey: string
}

// El panel de filtros completo: vistas guardadas, la barra y el menú de qué filtros ver. Existía
// dos veces —Stratix y Research, con el mismo Panel, el mismo chip y la misma llamada a
// FilterBar—; las dos se borraron por ésta. No dibuja markup propio: compone.
// El estado NO vive acá: llega entero desde `useFilters`, que el módulo llama en su propio hook.
// El tablero de /tasks lee el conjunto filtrado para sus KPIs; encerrado acá no podría verlo.
//
// El conteo va en la CABECERA: los filtros se recuerdan y el panel se deja recogido, así que es
// lo ÚNICO que explica por qué las cifras de abajo no son las del año.
export default function FiltersPanel<T>({ filtros, items, persistKey }: Props<T>) {
  const { t } = useT()
  const labelFor = (d: FilterDef<T>) => t(d.labelKey)
  const chip = filtros.activos > 0
    ? <ColorBadge color="var(--c-accent)">{t('common.filter.activeCount', { n: filtros.activos })}</ColorBadge>
    : undefined
  // `items` son TODOS y no los filtrados: al elegir una marca desaparecerían las demás. Y filtran
  // los `visibles`, mientras el picker ofrece `defs`: esconder un filtro lo saca Y deja de filtrar.
  return (
    <Panel collapsible persistKey={persistKey} title={t('common.filter.section')} right={chip}>
      <FilterPresets vistas={filtros.vistas} activaId={filtros.vistaActivaId} modificada={filtros.modificada}
        onAplicar={filtros.aplicarVista} onGuardar={filtros.guardarVista} onActualizar={filtros.actualizarVista}
        onRenombrar={filtros.renombrarVista}
        onBorrar={filtros.borrarVista} onMarcar={filtros.marcarPorDefecto} />
      <FilterBar defs={filtros.visibles} items={items} values={filtros.valores}
        onChange={filtros.setValor} onClear={filtros.limpiar} labelFor={labelFor}>
        <FilterPicker defs={filtros.defs} ocultos={filtros.ocultos} labelFor={labelFor}
          onAlternar={filtros.alternarVisible} />
      </FilterBar>
    </Panel>
  )
}
