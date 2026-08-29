// centinela-exime: archivo-extenso@2 — es el catálogo de módulos: una entrada por módulo y
// nada más. Partirlo dejaría la mitad de los módulos en un archivo y la mitad en otro, que es
// exactamente lo que hace ilegible un catálogo. Crece de a una entrada, no de a una función.

import type { ModuleMeta } from './types'
import { MODULE, type ModuleSlug } from './slugs'

export { MODULE, type ModuleSlug } from './slugs'
export type { AreaLeader, SubArea, ModuleMeta } from './types'

export const MODULE_META: Record<ModuleSlug, ModuleMeta> = {
  [MODULE.STRATIX_MKT]: {
    slug: MODULE.STRATIX_MKT,
    name: 'Stratix 360',
    description: 'Marketing, producción y campañas de Eminat Group.',
    leader: { name: 'Freddy Crespín', title: 'Director de Marketing' },
    subAreas: [
      { name: 'Diseño', leader: 'Joselyne Guerrero' },
      { name: 'Edición', leader: 'David Falconi' },
      { name: 'Automatización · Data & Insight', leader: 'Wagner Dueñas' },
      { name: 'Cuentas / CM', leader: 'Naomi Panchana' },
    ],
  },
  [MODULE.COBRANZAS]: {
    slug: MODULE.COBRANZAS,
    name: 'Cobranzas',
    description: 'Facturación, cobros y conciliación.',
    leader: null,
  },
  [MODULE.RESEARCH]: {
    slug: MODULE.RESEARCH,
    name: 'Investigación',
    description: 'Operaciones de investigación clínica y leads.',
    leader: null,
  },
  [MODULE.MEDICAL]: {
    slug: MODULE.MEDICAL,
    name: 'Médico',
    description: 'Pacientes, citas y workflows clínicos.',
    leader: null,
  },
  [MODULE.ACCOUNTING]: {
    slug: MODULE.ACCOUNTING,
    name: 'Contabilidad',
    description: 'Libros, impuestos y reportes financieros.',
    leader: null,
  },
  [MODULE.TH_HR]: {
    slug: MODULE.TH_HR,
    name: 'Talento Humano',
    description: 'Personas, nómina y desempeño.',
    leader: null,
  },
  [MODULE.DIRECTORIO]: {
    slug: MODULE.DIRECTORIO,
    name: 'Directorio',
    description: 'Todo el equipo de Eminat Group en un lugar.',
    leader: null,
  },
  [MODULE.ADMIN]: {
    slug: MODULE.ADMIN,
    name: 'Administración',
    description: 'Usuarios, roles y configuración del sistema.',
    leader: null,
  },
}

// Se DERIVA de MODULE_META: agregar un módulo es agregar una entrada, no dos.
export const ALL_MODULES = Object.keys(MODULE_META) as ModuleSlug[]

export function isModuleSlug(value: unknown): value is ModuleSlug {
  return typeof value === 'string' && value in MODULE_META
}
