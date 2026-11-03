import {
  BLOCK_BORDER_PX,
  BLOCK_GAP_PX,
  BLOCK_PADDING_PX,
  MIN_NOTE_LINES,
  NOTE_LINE_HEIGHT_PX,
  TIME_LINE_HEIGHT_PX,
} from '../constants'

/** How many lines of note text fit in a block of `heightPx`, after its own padding, time
 *  label, and gap take their share — ported from the approved prototype's `--note-lines`
 *  formula unchanged. */
export default function noteLines(heightPx: number, compact: boolean): number {
  const padding = compact ? BLOCK_PADDING_PX.compact : BLOCK_PADDING_PX.normal
  const timeLine = compact ? TIME_LINE_HEIGHT_PX.compact : TIME_LINE_HEIGHT_PX.normal
  const noteLine = compact ? NOTE_LINE_HEIGHT_PX.compact : NOTE_LINE_HEIGHT_PX.normal
  const gap = compact ? BLOCK_GAP_PX.compact : BLOCK_GAP_PX.normal
  const available = heightPx - BLOCK_BORDER_PX - padding * 2 - timeLine - gap

  return Math.max(MIN_NOTE_LINES, Math.floor(available / noteLine))
}

// This module is the one place a block's own pixel height becomes its note's line-clamp count.
