import CATALOG_COLUMNS from './catalogs'
import SHARED_COLUMNS from './shared'

const { identified, created, versioned, activatable } = SHARED_COLUMNS

/** Column names for filters and orders, by table; each map spreads only the shared groups its table has. */
const TABLE_COLUMNS = {
  ...CATALOG_COLUMNS,
  actividades: {
    ...identified,
    ...created,
    ...versioned,
  },
  topics: {
    ...identified,
    ...created,
    actividadId: 'actividad_id',
  },
  usuarios: {
    ...identified,
    ...created,
    ...versioned,
    ...activatable,
    authId: 'auth_id',
    rol: 'rol',
  },
  roles: {
    ...created,
    ...versioned,
    key: 'key',
    label: 'label',
    isSystem: 'is_system',
  },
  roleModules: {
    roleKey: 'role_key',
    moduleSlug: 'module_slug',
  },
} as const

export default TABLE_COLUMNS

// TABLE_COLUMNS keeps column names out of call arguments. Names several tables share come from
// SHARED_COLUMNS; the sibling tests pin every name to a migration and forbid hand-written repeats.
