/** Longest a range note may be; mirrors the database note check constraint. */
export const NOTE_MAX_LENGTH = 280

/** Ten ranges for each of seven days: a defensive transport cap, not a product quota. */
export const MAX_RANGES_PER_REQUEST = 70

/** Skips the browser cache so an edit by a teammate is visible on the next load. */
export const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }

/** The Postgres exclusion-violation SQLSTATE raised by the no-overlap constraint. */
export const EXCLUSION_VIOLATION_CODE = '23P01'

/** HTTP status for a caller with no active `usuarios` row behind their session. */
export const PROFILE_UNAVAILABLE_STATUS = 403

/** Returned when the caller has no active `usuarios` row behind their session. */
export const PROFILE_UNAVAILABLE_MESSAGE = 'Perfil no disponible.'

/** HTTP status for a PUT body that fails schema validation or `validateRanges`. */
export const INVALID_RANGES_STATUS = 400

/** Returned when the PUT body fails schema validation or `validateRanges` rejects it. */
export const INVALID_RANGES_MESSAGE = 'Datos de disponibilidad inválidos.'

/** HTTP status for a concurrent write that collided with an existing range of the caller. */
export const SAVE_CONFLICT_STATUS = 409

/** Returned when a concurrent write collided with an existing range of the caller mid-save. */
export const SAVE_CONFLICT_MESSAGE = 'No se pudo guardar: hay un conflicto con otro rango.'

/** HTTP status for any other failure saving the ranges of the caller. */
export const SAVE_FAILED_STATUS = 400

/** Returned for any other failure saving the ranges of the caller. */
export const SAVE_FAILED_MESSAGE = 'No se pudo guardar la disponibilidad.'

/** HTTP status for a failure reading the visible availability rows. */
export const LOAD_FAILED_STATUS = 500

/** Thrown if zod ever hands `normalizeRange` a range without the weekday the schema requires. */
export const MISSING_WEEKDAY_MESSAGE =
  'zod inferred `weekday` as optional even though the schema requires it'

/** Returned when `get_visible_weekly_availability()` fails or returns nothing usable. */
export const LOAD_FAILED_MESSAGE = 'No se pudieron cargar las disponibilidades.'
