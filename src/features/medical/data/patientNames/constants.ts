/** Ids per request: 100 uuids keep the `in (…)` filter well under a gateway's URL limit. */
export const ID_BATCH = 100
/** Only what a summary needs. */
export const NAME_COLUMNS = 'id, nombre, apellido'
/** `PromiseSettledResult.status` of a batch that loaded. */
export const FULFILLED = 'fulfilled'
/** `PromiseSettledResult.status` of a batch that failed. */
export const REJECTED = 'rejected'
