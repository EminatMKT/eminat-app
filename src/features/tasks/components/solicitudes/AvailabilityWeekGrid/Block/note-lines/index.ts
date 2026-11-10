import {
  BLOCK_BORDER_PX,
  BLOCK_GAP_PX,
  BLOCK_PADDING_PX,
  MIN_NOTE_LINES,
  NOTE_LINE_HEIGHT_PX,
  TIME_LINE_HEIGHT_PX,
} from '../constants'
import type { BlockSize } from '../types'

/** How many lines of note text fit in a block of `heightPx` drawn at `size`, after its own
 *  padding, time label, and gap take their share — ported from the approved prototype's
 *  `--note-lines` formula unchanged. */
export default function noteLines(heightPx: number, size: BlockSize): number {
  const padding = BLOCK_PADDING_PX[size]
  const timeLine = TIME_LINE_HEIGHT_PX[size]
  const noteLine = NOTE_LINE_HEIGHT_PX[size]
  const gap = BLOCK_GAP_PX[size]
  const available = heightPx - BLOCK_BORDER_PX - padding * 2 - timeLine - gap

  return Math.max(MIN_NOTE_LINES, Math.floor(available / noteLine))
}

// This module is the one place a block's own pixel height becomes its note's line-clamp count.
