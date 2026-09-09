import filtrosFechas from './grupos/fechas'
import filtrosTrabajo from './grupos/trabajo'
import filtrosGente from './grupos/gente'
import type { FilterDef } from '@/shared/utils'
import type { Actividad } from '@/features/tasks/types'
import type { Deps } from './tipos'

export type { Deps } from './tipos'

export function activityFilters(deps: Deps): FilterDef<Actividad>[] {
  const defs = [
    ...filtrosFechas(),
    ...filtrosTrabajo(deps),
    ...filtrosGente(deps),
  ]
  return defs
}

// Los filtros del tablero, declarados una sola vez: de este array salen la UI (FilterBar), el
// predicado (applyFilters) y el clear — igual que LEAD_FILTERS en Research. Agregar un filtro es
// agregar un def, y no hay una segunda lista que actualizar.
//
// Van AGRUPADOS por lo que preguntan, como los campos de la ficha en `act-detail-fields/grupos/`:
// cuándo (las dos fechas), en qué anda (estado, marca, verificación, bloqueo) y de quién es
// (responsable, solicitante, área). Nueve defs seguidos en un archivo se leen como una tabla de
// propiedades —hay que recorrerla entera para encontrar uno—; y el orden de este array es el
// orden en que se ofrecen en el «+ Filtro».
//
// Es una FUNCIÓN y no una constante porque varios filtros necesitan traducir lo que muestran: el
// estado y la verificación tienen su canónico en español, y el responsable, el solicitante y el
// área son uuids. Las dependencias entran por parámetro y no por contexto para que los defs
// sigan siendo puros y testeables sin montar nada.
//
// Con cuáles ABRE la barra lo dice cada def con su `principal` —hoy estado y responsable, que son
// las dos preguntas que alguien que entra por primera vez sabe hacer— y no una lista de claves
// aparte, que el compilador no miraba.
