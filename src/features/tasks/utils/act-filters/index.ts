import { COLUMNAS_KANBAN, estadoLabel } from '@/shared/constants/domain'
import { distinctValues, enRango, type FilterDef } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'

type Deps = {
  t: (k: I18nKey) => string
  nombrePorId: Record<string, string> // uuid de responsable → nombre a mostrar
  departamentoPorResponsable: Record<string, string> // uuid de usuario → uuid de departamento
  nombreDepartamento: Record<string, string> // uuid de departamento → nombre a mostrar
  departamentoPropio?: string // el de quien mira: con eso arranca el filtro
}

export function actividadFilters({
  t, nombrePorId,
  departamentoPorResponsable, nombreDepartamento, departamentoPropio,
}: Deps): FilterDef<Actividad>[] {
  return [
    { key: 'fecha_inicio', labelKey: 'stratix.detail.start', nameKey: 'stratix.detail.start',
      kind: 'dateRange', match: (a, v) => enRango(v, a.fecha_inicio) },
    { key: 'fecha_entrega', labelKey: 'stratix.col.due', nameKey: 'stratix.col.due',
      kind: 'dateRange', match: (a, v) => enRango(v, a.fecha_entrega) },
    { key: 'estado', labelKey: 'stratix.filter.allStatuses', nameKey: 'stratix.filter.status',
      principal: true,
      options: () => [...COLUMNAS_KANBAN],
      optionLabel: e => estadoLabel(e, t),
      match: (a, v) => a.estado === v },
    // Marca y responsable salen de los datos presentes: el catálogo de empresas tiene 11 filas
    // de las que solo algunas reciben actividades, y el de usuarios incluye a quien nunca tuvo
    // una tarea. Un desplegable con opciones que no filtran nada es ruido.
    { key: 'empresa', labelKey: 'stratix.filter.allBrands', nameKey: 'stratix.filter.brand',
      principal: true,
      options: items => distinctValues(items, a => a.empresa),
      match: (a, v) => a.empresa === v },
    { key: 'responsable_id', labelKey: 'stratix.filter.allAssignees', nameKey: 'stratix.filter.assignee',
      options: items => distinctValues(items, a => a.responsable_id)
        .sort((x, y) => (nombrePorId[x] ?? '').localeCompare(nombrePorId[y] ?? '')),
      optionLabel: id => nombrePorId[id] ?? '—',
      match: (a, v) => a.responsable_id === v },
    // El área NO sale de una columna: se DERIVA del responsable, que es obligatorio. Arranca en
    // la de quien mira y se puede quitar — es comodidad, no control de acceso: quien tiene el
    // módulo lee todas las tareas de la empresa y la RLS no corta por departamento.
    { key: 'departamento', labelKey: 'tasks.filter.allAreas', nameKey: 'tasks.filter.area',
      defaultValue: departamentoPropio,
      options: items => distinctValues(items, a => departamentoPorResponsable[a.responsable_id ?? '']),
      optionLabel: id => nombreDepartamento[id] ?? '—',
      match: (a, v) => departamentoPorResponsable[a.responsable_id ?? ''] === v },
  ]
}

// Los filtros del tablero, declarados una sola vez: de este array salen la UI (FilterBar), el
// predicado (applyFilters) y el clear — igual que LEAD_FILTERS en Research. Agregar un filtro
// es agregar un def, y no hay una segunda lista que actualizar.
//
// Es una FUNCIÓN y no una constante porque tres de los filtros necesitan traducir lo que
// muestran: el estado tiene su canónico en español (`ESTADO.PENDIENTE === 'Pendiente'`), y el
// responsable y el área son uuids. Las dependencias entran por parámetro y no por contexto para
// que el módulo siga siendo puro y testeable sin montar nada.
//
// El tiempo se filtra por RANGO y por COLUMNA. Antes eran dos desplegables —trimestre y mes—
// sobre `fecha_inicio`, y traían los dos problemas juntos: la pregunta quedaba recortada a los
// cortes del calendario (o marzo entero, o el trimestre completo), y decía «Mes» sin decir el mes
// de qué, cuando una actividad tiene dos fechas y la que importa depende de lo que se pregunte
// —cuándo se empezó o cuándo vence—.
//
// Por eso son dos defs y no uno rotulado «Fecha»: se llaman como las columnas y se rotulan con
// los mismos nombres que el detalle y la tabla, «Inicio» y «Entrega». Los cortes del calendario
// no se perdieron, bajaron a ser un atajo: la gráfica por mes rellena el rango de inicio con un
// clic.
