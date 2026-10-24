/** Longest a range's free-text note may be — mirrors `user_weekly_availability_ranges.note`'s check constraint. */
export const NOTE_MAX_LENGTH = 280

/** Ten ranges for each of seven days: a defensive transport cap, not a product quota. */
export const MAX_RANGES_PER_REQUEST = 70

/** Forces every GET response to skip the browser cache: a teammate's edit must be visible on the next load. */
export const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }

/** Postgres' exclusion-violation SQLSTATE, fired by the no-overlap constraint on a concurrent write. */
export const EXCLUSION_VIOLATION_CODE = '23P01'

/** HTTP status for a caller with no active `usuarios` row behind their session. */
export const PROFILE_UNAVAILABLE_STATUS = 403

/** Returned when the caller has no active `usuarios` row behind their session. */
export const PROFILE_UNAVAILABLE_MESSAGE = 'Perfil no disponible.'

/** HTTP status for a PUT body that fails schema validation or `validateRanges`. */
export const INVALID_RANGES_STATUS = 400

/** Returned when the PUT body fails schema validation or `validateRanges` rejects it. */
export const INVALID_RANGES_MESSAGE = 'Datos de disponibilidad inválidos.'

/** HTTP status for a concurrent write that collided with the caller's own ranges. */
export const SAVE_CONFLICT_STATUS = 409

/** Returned when a concurrent write collided with the caller's own ranges mid-save. */
export const SAVE_CONFLICT_MESSAGE = 'No se pudo guardar: hay un conflicto con otro rango.'

/** HTTP status for any other failure saving the caller's ranges. */
export const SAVE_FAILED_STATUS = 400

/** Returned for any other failure saving the caller's ranges. */
export const SAVE_FAILED_MESSAGE = 'No se pudo guardar la disponibilidad.'

/** HTTP status for a failure reading the caller's visible availability rows. */
export const LOAD_FAILED_STATUS = 500

/** Returned when `get_visible_weekly_availability()` fails or returns nothing usable. */
export const LOAD_FAILED_MESSAGE = 'No se pudieron cargar las disponibilidades.'
