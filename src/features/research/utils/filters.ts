// Filtros de la tabla de leads, declarados una sola vez. La UI (FilterBar), el predicado
// (applyFilters) y el clear derivan de acá → agregar/quitar un filtro es editar este array.
// Las opciones REUSAN las listas canónicas del def de campo (domainOptions) donde existen;
// solo los campos libres (sponsor, país) se derivan de la data presente.
import { domainOptions } from './fields'
import { NO_SPECIALTY } from './specialty'
import { NO_STAGE, NO_PHASE, PHASE_TOKENS, phasesOf } from './charts'
import { distinctValues, distinctTokens, enRango, type FilterDef } from '@/shared/utils'
import type { Lead } from '../types'

const eq = (get: (l: Lead) => unknown) => (l: Lead, v: string) => String(get(l) ?? '') === v
const includes = (get: (l: Lead) => unknown) => (l: Lead, v: string) => String(get(l) ?? '').includes(v)
const domain = (column: string) => () => domainOptions(column) ?? []

export const LEAD_FILTERS: FilterDef<Lead>[] = [
  // Royner llega con su lista de NCT# ya trabajada y los pega acá. Case-insensitive y por
  // inclusión: pegar "NCT0123" o "0123" encuentra igual.
  { key: 'nct', labelKey: 'research.filter.nct', nameKey: 'research.filter.nctName', kind: 'text', match: (l, v) => (l.nct_number ?? '').toLowerCase().includes(v.trim().toLowerCase()) },
  // Rango de carga en UNA clave. Eran dos defs, y el motor los contaba como dos filtros activos
  // sobre la misma pregunta; el control tampoco impedía poner el «desde» después del «hasta».
  { key: 'added', labelKey: 'research.filter.added', nameKey: 'research.filter.added', kind: 'dateRange', match: (l, v) => enRango(v, l.date_added) },
  // Los centinelas de "sin valor" (acá y en fase/especialidad) existen porque cada barra del
  // dashboard es clickeable: la barra "Sin etapa" tiene que poder filtrar sus leads, y un valor
  // vacío no sirve para eso — significa "filtro apagado". Van también a `options` para que se
  // puedan elegir a mano. El centinela y el bucket de la gráfica salen del MISMO módulo
  // (./charts) y charts.test.ts verifica que digan lo mismo.
  { key: 'stage', labelKey: 'research.filter.allStages', nameKey: 'research.filter.stage',
    options: () => [...(domainOptions('stage') ?? []), NO_STAGE],
    match: (l, v) => (v === NO_STAGE ? !(l.stage ?? '').toString().trim() : String(l.stage ?? '') === v) },
  // phase es multivalor ("Phase 1/Phase 2") → match por inclusión sobre las opciones del dominio.
  // Mismo `phasesOf` que usa la gráfica: la barra 'Phase 2' y este filtro preguntan lo mismo, y
  // charts.test.ts verifica que devuelvan lo mismo. Las opciones son las fases ATÓMICAS (más el
  // centinela): ofrecer 'Phase 1/Phase 2' en el desplegable no tendría sentido cuando un estudio
  // combinado ya aparece al elegir cualquiera de sus dos fases.
  { key: 'phase', labelKey: 'research.filter.allPhases', nameKey: 'research.filter.phase',
    options: () => [...PHASE_TOKENS, NO_PHASE],
    match: (l, v) => phasesOf(l).includes(v) },
  { key: 'status', labelKey: 'research.filter.allStatuses', nameKey: 'research.filter.status', options: domain('recruitment_status'), match: eq(l => l.recruitment_status) },
  { key: 'country', labelKey: 'research.filter.allCountries', nameKey: 'research.filter.country', options: items => distinctTokens(items, l => l.countries), match: includes(l => l.countries) },
  { key: 'sponsor', labelKey: 'research.filter.allSponsors', nameKey: 'research.filter.sponsor', options: items => distinctValues(items, l => l.lead_sponsor), match: eq(l => l.lead_sponsor) },
  // Es el filtro que responde "¿cuántos estudios de oncología tenemos?" sin exportar nada —
  // el motivo por el que existe la columna. Dominio cerrado ⇒ opciones del def, no de la data.
  // El centinela NO_SPECIALTY se suma al dominio para poder pedir "los que faltan clasificar"
  // (1 de cada 4). Sin él no se puede: un valor vacío significa "filtro apagado".
  { key: 'specialty', labelKey: 'research.filter.allSpecialties', nameKey: 'research.filter.specialty',
    options: () => [...(domainOptions('especialidad') ?? []), NO_SPECIALTY],
    match: (l, v) => (v === NO_SPECIALTY ? !(l.especialidad || '').trim() : String(l.especialidad ?? '') === v) },
]
