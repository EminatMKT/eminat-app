// Filtros de la tabla de leads, declarados una sola vez. La UI (FilterBar), el predicado
// (applyFilters) y el clear derivan de acá → agregar/quitar un filtro es editar este array.
// Las opciones REUSAN las listas canónicas del def de campo (domainOptions) donde existen;
// solo los campos libres (sponsor, país) se derivan de la data presente.
import { domainOptions } from './fields'
import { distinctValues, distinctTokens, type FilterDef } from '@/shared/lib/filters'
import type { Lead } from './types'

const eq = (get: (l: Lead) => unknown) => (l: Lead, v: string) => String(get(l) ?? '') === v
const includes = (get: (l: Lead) => unknown) => (l: Lead, v: string) => String(get(l) ?? '').includes(v)
const domain = (column: string) => () => domainOptions(column) ?? []

export const LEAD_FILTERS: FilterDef<Lead>[] = [
  { key: 'stage', labelKey: 'research.filter.allStages', options: domain('stage'), match: eq(l => l.stage) },
  // phase es multivalor ("Phase 1/Phase 2") → match por inclusión sobre las opciones del dominio.
  { key: 'phase', labelKey: 'research.filter.allPhases', options: domain('phase'), match: includes(l => l.phase) },
  { key: 'status', labelKey: 'research.filter.allStatuses', options: domain('recruitment_status'), match: eq(l => l.recruitment_status) },
  { key: 'country', labelKey: 'research.filter.allCountries', options: items => distinctTokens(items, l => l.countries), match: includes(l => l.countries) },
  { key: 'sponsor', labelKey: 'research.filter.allSponsors', options: items => distinctValues(items, l => l.lead_sponsor), match: eq(l => l.lead_sponsor) },
]
