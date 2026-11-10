/** The single endpoint both availability adapter functions call — GET to read, PUT to save. */
export const AVAILABILITY_ENDPOINT = '/api/tasks/availability'

/** Stable error code `fetchVisibleAvailability` throws when the GET does not succeed. */
export const LOAD_FAILED_MESSAGE = 'TASK_AVAILABILITY_LOAD_FAILED'

/** Stable error code `saveOwnAvailability` throws when the PUT does not succeed. */
export const SAVE_FAILED_MESSAGE = 'TASK_AVAILABILITY_SAVE_FAILED'
