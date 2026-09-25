/** What the crash screen does with an error: reload the page once, or show itself. */
export const RELOAD = 'reload'
export const SHOW = 'show'
export type CrashRecovery = typeof RELOAD | typeof SHOW
/** Before the first effect runs, while it is not known yet which of the two it will be. */
export const DECIDING = 'deciding'

/** The name webpack gives an error when a chunk does not arrive. */
export const CHUNK_LOAD_ERROR_NAME = 'ChunkLoadError'

/** webpack's message for a missing JS or CSS chunk. A minified build may drop the name, so the
 *  message is the fallback. */
export const CHUNK_LOAD_MESSAGE = /Loading (CSS )?chunk .* failed/

/** Where the time of the last automatic reload is kept, per tab. */
export const RELOAD_STAMP_KEY = 'crash-recovery.reloaded-at'

/** A second failure inside this window means the reload did not help, so it is not repeated.
 *  Longer than webpack's two-minute chunk timeout, so a hung download still lands inside it. */
export const RELOAD_WINDOW_MS = 5 * 60 * 1000

// The values `crash-recovery` reads, apart from the logic that reads them.
