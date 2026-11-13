// Sample values the popover's suites share: one name per value, so two suites that build the same
// range or expect the same message never spell it twice.

/** The `clientId` of the sample range the popover suites edit. */
export const SAMPLE_CLIENT_ID = 'range-client-1'

/** The day label the sample range's fields are named after. */
export const SAMPLE_DAY_LABEL = 'Monday'

/** The `id` the end-time suites give their select. */
export const END_FIELD_ID = 'end-id'

/** An end time off the half-hour grid, which a saved range may still carry. */
export const OFF_STEP_END_TIME = '17:15'

/** The end-before-start message the end-field suites show. */
export const END_ERROR_TEXT = 'End must be after start'

/** The validation code of a range whose end is not after its start. */
export const END_NOT_AFTER_START_CODE = 'end-not-after-start'

/** The validation code of two colliding ranges. */
export const OVERLAP_CODE = 'overlap'

/** The i18n key an overlap error resolves to. */
export const OVERLAP_COPY_KEY = 'tasks.availability.overlap'
