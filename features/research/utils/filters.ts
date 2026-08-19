// Filtros de la tabla de leads, declarados una sola vez. La UI (FilterBar), el predicado
// (applyFilters) y el clear derivan de acá → agregar/quitar un filtro es editar este array.
// Las opciones REUSAN las listas canónicas del def de campo (domainOptions) donde existen;
// solo los campos libres (sponsor, país) se derivan de la data presente.
import { domainOptions } from './fields'
import { NO_SPECIALTY } from './specialty'
import { NO_STAGE, NO_PHASE, PHASE_TOKENS, phasesOf } from './charts'
import { distinctValues, distinctTokens, type FilterDef } from '@/shared/lib/filters'
import type { Lead } from '../types'

const eq = (get: (l: Lead) => any) => (l: Lead, v: string) => String(get(l) ?? '') === v
const includes = (get: (l: Lead) => any) => (l: Lead, v: string) => String(get(l) ?? '').includes(v)
const domain = (column: string) => () => domainOptions(column) ?? []

export const LEAD_FILTERS: FilterDef<Lead>[] = [
  // Royner llega con su lista de NCT# ya trabajada y los pega acá. Case-insensitive y por
  // inclusión: pegar "NCT0123" o "0123" encuentra igual.
  { key: 'nct', labelKey: 'research.filter.nct', kind: 'text', match: (l, v) => (l.nct_number ?? '').toLowerCase().includes(v.trim().toLowerCase()) },
  // Rango de carga: dos filtros sueltos en vez de un valor compuesto — applyFilters ya los
  // combina en AND y el estado sigue siendo Record<string,string>. date_added es DATE
  // (YYYY-MM-DD) → comparación lexicográfica. Sin fecha = fuera del rango.
  { key: 'addedFrom', labelKey: 'research.filter.addedFrom', kind: 'date', match: (l, v) => !!l.date_added && l.date_added >= v },
  { key: 'addedTo', labelKey: 'research.filter.addedTo', kind: 'date', match: (l, v) => !!l.date_added && l.date_added <= v },
  // Los centinelas de "sin valor" (acá y en fase/especialidad) existen porque cada barra del
  // dashboard es clickeable: la barra "Sin etapa" tiene que poder filtrar sus leads, y un valor
  // vacío no sirve para eso — significa "filtro apagado". Van también a `options` para que se
  // puedan elegir a mano. El centinela y el bucket de la gráfica salen del MISMO módulo
  // (./charts) y charts.test.ts verifica que digan lo mismo.
  { key: 'stage', labelKey: 'research.filter.allStages',
    options: () => [...(domainOptions('stage') ?? []), NO_STAGE],
    match: (l, v) => (v === NO_STAGE ? !(l.stage ?? '').toString().trim() : String(l.stage ?? '') === v) },
  // phase es multivalor ("Phase 1/Phase 2") → match por inclusión sobre las opciones del dominio.
  // Mismo `phasesOf` que usa la gráfica: la barra 'Phase 2' y este filtro preguntan lo mismo, y
  // charts.test.ts verifica que devuelvan lo mismo. Las opciones son las fases ATÓMICAS (más el
  // centinela): ofrecer 'Phase 1/Phase 2' en el desplegable no tendría sentido cuando un estudio
  // combinado ya aparece al elegir cualquiera de sus dos fases.
  { key: 'phase', labelKey: 'research.filter.allPhases',
    options: () => [...PHASE_TOKENS, NO_PHASE],
    match: (l, v) => phasesOf(l).includes(v) },
  { key: 'status', labelKey: 'research.filter.allStatuses', options: domain('recruitment_status'), match: eq(l => l.recruitment_status) },
  { key: 'country', labelKey: 'research.filter.allCountries', options: items => distinctTokens(items, l => l.countries), match: includes(l => l.countries) },
  { key: 'sponsor', labelKey: 'research.filter.allSponsors', options: items => distinctValues(items, l => l.lead_sponsor), match: eq(l => l.lead_sponsor) },
  // Es el filtro que responde "¿cuántos estudios de oncología tenemos?" sin exportar nada —
  // el motivo por el que existe la columna. Dominio cerrado ⇒ opciones del def, no de la data.
  // El centinela NO_SPECIALTY se suma al dominio para poder pedir "los que faltan clasificar"
  // (1 de cada 4). Sin él no se puede: un valor vacío significa "filtro apagado".
  { key: 'specialty', labelKey: 'research.filter.allSpecialties',
    options: () => [...(domainOptions('especialidad') ?? []), NO_SPECIALTY],
    match: (l, v) => (v === NO_SPECIALTY ? !(l.especialidad || '').trim() : String(l.especialidad ?? '') === v) },
]
