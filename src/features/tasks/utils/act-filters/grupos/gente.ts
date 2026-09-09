import { distinctValues, type FilterDef } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'
import type { Deps } from '../tipos'

// Un filtro de PERSONA: la columna guarda un uuid, así que las opciones salen de los datos
// presentes, se ordenan por el nombre visible y se rotulan con él. Sin esto el desplegable
// listaría uuids, ordenados por uuid.
const persona = (
  key: string, labelKey: I18nKey, nameKey: I18nKey,
  nombrePorId: Record<string, string>, leer: (a: Actividad) => string | undefined,
): FilterDef<Actividad> => ({
  key, labelKey, nameKey,
  options: items => distinctValues(items, leer)
    .sort((x, y) => (nombrePorId[x] ?? '').localeCompare(nombrePorId[y] ?? '')),
  optionLabel: id => nombrePorId[id] ?? '—',
  match: (a, v) => leer(a) === v,
})

/** De quién es la tarea: quién la ejecuta, quién la pidió y de qué área sale. */
export default function filtrosGente(deps: Deps): FilterDef<Actividad>[] {
  const { nombrePorId, departamentoPorResponsable, nombreDepartamento, departamentoPropio } = deps
  const areaDe = (a: Actividad) => departamentoPorResponsable[a.responsable_id ?? '']
  return [
    // Responsable abre la barra junto al estado: «de quién es» es la otra pregunta que no hay
    // que explicar.
    { ...persona('responsable_id', 'stratix.filter.allAssignees', 'stratix.filter.assignee',
      nombrePorId, a => a.responsable_id), principal: true },
    // Quién la PIDIÓ, que no es quién la ejecuta. Es la otra mitad de la pregunta que contesta
    // el reporte de pago —«lo que ejecuto más lo que pedí»— y sólo se podía mirar de a una.
    persona('solicitante_id', 'stratix.filter.allRequesters', 'stratix.detail.requestedBy',
      nombrePorId, a => a.solicitante_id),
    // El área NO sale de una columna: se DERIVA del responsable, que es obligatorio. Arranca en
    // la de quien mira y se puede quitar — es comodidad, no control de acceso: quien tiene el
    // módulo lee todas las tareas de la empresa y la RLS no corta por departamento.
    { ...persona('departamento', 'tasks.filter.allAreas', 'tasks.filter.area',
      nombreDepartamento, areaDe), defaultValue: departamentoPropio },
  ]
}
