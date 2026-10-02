import SHARED_COLUMNS from '../shared'

const { identified, created, named, activatable } = SHARED_COLUMNS

/** Columns of the organisation catalogues the admin edits: companies, departments and teams. */
const CATALOG_COLUMNS = {
  empresas: {
    ...identified,
    ...created,
    ...named,
    ...activatable,
    recibeActividades: 'recibe_actividades',
  },
  departamentos: {
    ...identified,
    ...created,
    ...named,
  },
  equipos: {
    ...identified,
    ...created,
    ...named,
    ...activatable,
  },
} as const

export default CATALOG_COLUMNS

// CATALOG_COLUMNS groups the three catalogue tables, which share their shape (code, name, active).
