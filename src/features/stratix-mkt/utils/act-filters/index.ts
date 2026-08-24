// Filtros del tablero de Stratix, declarados una sola vez: de este array salen la UI
// (FilterBar), el predicado (applyFilters) y el clear — igual que LEAD_FILTERS en Research.
// Agregar un filtro es agregar un def.
//
// Es una FUNCIÓN y no una constante porque dos de los filtros necesitan traducir lo que
// muestran: el estado tiene su canónico en español (`ESTADO.PENDIENTE === 'Pendiente'`) y el
// responsable es un uuid. Las dependencias entran por parámetro y no por contexto para que el
// módulo siga siendo puro y testeable sin montar nada.
import { MESES, TRIMESTRES, COLUMNAS_KANBAN, mesATrimestre, estadoLabel } from '@/shared/constants/domain'
import { distinctValues, type FilterDef } from '@/shared/utils/filters'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/stratix-mkt/types'

type Deps = {
  t: (k: I18nKey) => string
  nombrePorId: Record<string, string> // uuid de responsable → nombre a mostrar
}

// `actividades.trimestre` se escribe al crear la tarea, pero el mes es el dato que la gente
// edita; si los dos discrepan gana el que está guardado y el mes es el respaldo. Mismo criterio
// que ActivityDetailModal, para que la ficha y el filtro no digan cosas distintas.
export const trimestreDe = (a: Actividad): string => a.trimestre || mesATrimestre[a.mes ?? ''] || ''

// 'General' es la ausencia de filtro, y eso ya lo representa el placeholder vacío del select.
const QUARTERS = TRIMESTRES.filter(q => q !== 'General')

export function actividadFilters({ t, nombrePorId }: Deps): FilterDef<Actividad>[] {
  return [
    { key: 'trimestre', labelKey: 'stratix.filter.allQuarters',
      options: () => QUARTERS,
      match: (a, v) => trimestreDe(a) === v },
    // Los 12 meses siempre, no los presentes en los datos: el tablero se usa para ver que un
    // mes está vacío, y una opción que desaparece cuando no hay tareas no permite preguntarlo.
    { key: 'mes', labelKey: 'stratix.filter.allMonths',
      options: () => MESES,
      match: (a, v) => a.mes === v },
    { key: 'estado', labelKey: 'stratix.filter.allStatuses',
      options: () => [...COLUMNAS_KANBAN],
      optionLabel: e => estadoLabel(e, t),
      match: (a, v) => a.estado === v },
    // Marca y responsable salen de los datos presentes: el catálogo de empresas tiene 11 filas
    // de las que solo algunas reciben actividades, y el de usuarios incluye a quien nunca tuvo
    // una tarea. Un desplegable con opciones que no filtran nada es ruido.
    { key: 'empresa', labelKey: 'stratix.filter.allBrands',
      options: items => distinctValues(items, a => a.empresa),
      match: (a, v) => a.empresa === v },
    { key: 'responsable_id', labelKey: 'stratix.filter.allAssignees',
      options: items => distinctValues(items, a => a.responsable_id)
        .sort((x, y) => (nombrePorId[x] ?? '').localeCompare(nombrePorId[y] ?? '')),
      optionLabel: id => nombrePorId[id] ?? '—',
      match: (a, v) => a.responsable_id === v },
  ]
}
