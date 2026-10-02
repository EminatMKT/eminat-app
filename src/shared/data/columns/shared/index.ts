/** Column groups several tables share; a table spreads the groups it really has instead of spelling the names. */
const SHARED_COLUMNS = {
  identified: {
    id: 'id',
  },
  created: {
    createdAt: 'created_at',
  },
  versioned: {
    updatedAt: 'updated_at',
  },
  named: {
    codigo: 'codigo',
    nombre: 'nombre',
  },
  activatable: {
    activo: 'activo',
  },
} as const

export default SHARED_COLUMNS

// SHARED_COLUMNS holds the names more than one table carries; the sibling test fails when a
// table spells one of them by hand or two tables repeat a name outside these groups.
