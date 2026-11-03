/** Block border width, in pixels — subtracted once from a block's own height before the note's
 *  line-clamp count is computed, matching the approved prototype's `--note-lines` formula. */
export const BLOCK_BORDER_PX = 2

/** The note's line-clamp count never drops below this, even for a block too short to fit it. */
export const MIN_NOTE_LINES = 1

/** Vertical padding, compact (≤30min blocks) vs normal. */
export const BLOCK_PADDING_PX = { compact: 2, normal: 6 }

/** Time-label line height, compact vs normal. */
export const TIME_LINE_HEIGHT_PX = { compact: 11, normal: 15 }

/** Note line height, compact vs normal. */
export const NOTE_LINE_HEIGHT_PX = { compact: 12, normal: 15 }

/** Gap between the time label and the note, compact vs normal. */
export const BLOCK_GAP_PX = { compact: 1, normal: 2 }
