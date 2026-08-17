// Filtros de la tabla de leads, declarados una sola vez. La UI (FilterBar), el predicado
// (applyFilters) y el clear derivan de acá → agregar/quitar un filtro es editar este array.
// Las opciones REUSAN las listas canónicas del def de campo (domainOptions) donde existen;
// solo los campos libres (sponsor, país) se derivan de la data presente.
import { domainOptions } from './fields'
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
  { key: 'stage', labelKey: 'research.filter.allStages', options: domain('stage'), match: eq(l => l.stage) },
  // phase es multivalor ("Phase 1/Phase 2") → match por inclusión sobre las opciones del dominio.
  { key: 'phase', labelKey: 'research.filter.allPhases', options: domain('phase'), match: includes(l => l.phase) },
  { key: 'status', labelKey: 'research.filter.allStatuses', options: domain('recruitment_status'), match: eq(l => l.recruitment_status) },
  { key: 'country', labelKey: 'research.filter.allCountries', options: items => distinctTokens(items, l => l.countries), match: includes(l => l.countries) },
  { key: 'sponsor', labelKey: 'research.filter.allSponsors', options: items => distinctValues(items, l => l.lead_sponsor), match: eq(l => l.lead_sponsor) },
]
