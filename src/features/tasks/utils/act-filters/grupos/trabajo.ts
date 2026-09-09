import { COLUMNAS_KANBAN, VERIFICADO, estadoLabel, verificadoLabel } from '@/shared/constants/domain'
import { distinctValues, type FilterDef } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'
import type { Deps } from '../tipos'

const VERIFICADOS = Object.values(VERIFICADO)
// El booleano viaja como texto: `FilterValues` es `Record<string, string>`, y meterle un tipo
// más partiría el formato con el que ya quedaron escritas las vistas guardadas.
const BLOQUEADA_SI = 'true'
const BLOQUEADA_NO = 'false'

// Un filtro de DOMINIO CERRADO: las opciones no salen de los datos sino de una lista fija, se
// rotulan traducidas y se comparan por igualdad. Los tres de acá abajo eran el mismo bloque
// escrito tres veces, con la lista, la etiqueta y la columna como única diferencia.
const dominio = (
  key: string, labelKey: I18nKey, nameKey: I18nKey,
  valores: readonly string[], rotulo: (v: string) => string, leer: (a: Actividad) => string,
): FilterDef<Actividad> =>
  ({ key, labelKey, nameKey, options: () => [...valores], optionLabel: rotulo, match: (a, v) => leer(a) === v })

/** En qué anda la tarea: su estado, su marca, dónde está en la revisión y si algo la frena. */
export default function filtrosTrabajo({ t }: Deps): FilterDef<Actividad>[] {
  return [
    // Estado abre la barra: «en qué anda» es la pregunta que alguien que entra por primera vez
    // sabe hacer sin que le expliquen el tablero.
    { ...dominio('estado', 'stratix.filter.allStatuses', 'stratix.filter.status',
      COLUMNAS_KANBAN, e => estadoLabel(e, t), a => a.estado ?? ''), principal: true },
    // La marca sale de los datos presentes y no del catálogo: tiene 11 filas y sólo algunas
    // reciben actividades. Un desplegable con opciones que no filtran nada es ruido.
    { key: 'empresa', labelKey: 'stratix.filter.allBrands', nameKey: 'stratix.filter.brand',
      options: items => distinctValues(items, a => a.empresa),
      match: (a, v) => a.empresa === v },
    // `verificado` NO es booleano: es texto con cuatro valores. Contesta «qué está esperando
    // aprobación», que hasta ahora había que contar a ojo columna por columna.
    dominio('verificado', 'stratix.filter.allVerifications', 'stratix.detail.verified',
      VERIFICADOS, v => verificadoLabel(v, t), a => a.verificado ?? ''),
    dominio('bloqueada', 'stratix.filter.allBlocked', 'stratix.detail.blocked',
      [BLOQUEADA_SI, BLOQUEADA_NO], v => t(v === BLOQUEADA_SI ? 'common.yes' : 'common.no'),
      a => String(!!a.bloqueada)),
  ]
}
