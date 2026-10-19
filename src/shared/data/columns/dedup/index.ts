/** Columns of the duplicate-review queue that the dedup data layer filters on. */
const DEDUP_COLUMNS = {
  duplicadosPendientes: {
    entidad: 'entidad',
  },
} as const

export default DEDUP_COLUMNS

// DEDUP_COLUMNS keeps the pending-pair queue's filter column in one place, so the list and the
// count of that queue read the same name instead of each spelling it out.
