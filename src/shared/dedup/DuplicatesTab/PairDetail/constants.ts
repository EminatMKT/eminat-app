/** A close request while a decision is in flight: nothing happens. */
export const CLOSE_IGNORED = 'close-ignored'
/** A close request that would throw away picks: ask first. */
export const CLOSE_CONFIRM = 'close-confirm'
/** A close request with nothing at stake: close. */
export const CLOSE_NOW = 'close-now'
/** The "keep separate" note dialog. */
export const NOTE_DIALOG = 'note-dialog'
/** The "discard your choices?" dialog. */
export const DISCARD_DIALOG = 'discard-dialog'
/** Wide enough for two values side by side; `Modal` caps it at 95vw on a phone. */
export const PAIR_WIDTH_REM = 48
