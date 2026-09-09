'use client'
import { useT } from '@/shared/i18n'
import Panel from '@/shared/components/dashboard/Panel'
import { ColorBadge } from '@/shared/components/ui'
import type { FilterDef } from '@/shared/utils'
import FilterBar from '../FilterBar'
import FilterPicker from '../FilterPicker'
import FilterPresets from '../FilterPresets'
import type { FiltersPanelProps } from './types'

// centinela-exime: familia-dispersa@2 — los otros `*Panel` son el contenedor de SU módulo
// (`SidebarPanel`, `ParticipantesPanel`); éste es el armador del motor y vive con sus piezas.

/** El panel de filtros completo: vistas guardadas, la barra y el menú de qué filtros ver. */
export default function FiltersPanel<T>({ filtros, items, persistKey }: FiltersPanelProps<T>) {
  const { t } = useT()
  const labelFor = (d: FilterDef<T>) => t(d.labelKey)
  const nameFor = (d: FilterDef<T>) => t(d.nameKey)
  // Vista y «modificada» van en UNA etiqueta: son una sola frase, y como dos píldoras del mismo
  // peso se leían como dos datos sueltos.
  const view = filtros.vistas.find(v => v.id === filtros.vistaActivaId)?.nombre
  const chip = (
    <>
      {view && (
        <ColorBadge color="var(--c-t2)">
          {filtros.modificada ? `${view} · ${t('common.filter.modified')}` : view}
        </ColorBadge>
      )}
      {filtros.activos > 0 && (
        <ColorBadge color="var(--c-accent)">{t('common.filter.activeCount', { n: filtros.activos })}</ColorBadge>
      )}
    </>
  )
  return (
    <Panel collapsible persistKey={persistKey} title={t('common.filter.section')} right={chip}>
      <FilterBar defs={filtros.visibles} items={items} values={filtros.valores}
        onChange={filtros.setValor} onClear={filtros.limpiar} labelFor={labelFor} nameFor={nameFor}
        before={
          <FilterPresets vistas={filtros.vistas} activaId={filtros.vistaActivaId} modificada={filtros.modificada}
            onAplicar={filtros.aplicarVista} onGuardar={filtros.guardarVista} onActualizar={filtros.actualizarVista}
            onRenombrar={filtros.renombrarVista}
            onBorrar={filtros.borrarVista} onMarcar={filtros.marcarPorDefecto} />
        }>
        <FilterPicker defs={filtros.defs} ocultos={filtros.ocultos} labelFor={nameFor}
          onAlternar={filtros.alternarVisible} />
      </FilterBar>
    </Panel>
  )
}

// El armador del motor. Existía dos veces —Stratix y Research, con el mismo Panel, el mismo chip y
// la misma llamada a FilterBar—; las dos se borraron por ésta. No dibuja markup propio: compone.
//
// El estado NO vive acá: llega entero desde `useFilters`, que el módulo llama en su propio hook.
// El tablero de /tasks lee el conjunto filtrado para sus KPIs; encerrado acá no podría verlo.
//
// El resumen va en la CABECERA porque es lo único que sobrevive al plegado: los filtros se
// recuerdan y el panel se deja recogido, así que es lo que explica por qué las cifras de abajo no
// son las del año, y con qué vista.
//
// `items` son TODOS y no los filtrados: al elegir una marca desaparecerían las demás. Y la barra
// dibuja los `visibles` mientras el picker ofrece `defs` —con `nameFor`, que es una lista de
// COLUMNAS—: esconder un filtro lo saca de la barra Y deja de filtrar.
