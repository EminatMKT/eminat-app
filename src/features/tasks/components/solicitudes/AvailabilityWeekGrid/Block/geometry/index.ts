import type { CSSProperties } from 'react'
import { minutesOf } from '@/features/tasks/utils/availability'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import minutesToPixels from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/minutes-to-pixels'
import { SNAP_MINUTES } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import {
  BLOCK_GAP_PX,
  BLOCK_PADDING_PX,
  NOTE_LINE_HEIGHT_PX,
  TIME_LINE_HEIGHT_PX,
} from '../constants'
import noteLines from '../note-lines'
import type { BlockGeometry } from './types'

const FALLBACK_MINUTE = 0
const pxValue = (value: number): string => `${value}px`

/** A range's pixel geometry as CSS custom properties, plus whether it is compact — the one
 *  place a range's clock time and pixel density become the block's actual rendered style. */
export default function blockGeometry(
  range: WeeklyAvailabilityRange,
  pxPerMin: number,
): BlockGeometry {
  const start = minutesOf(range.startsAt) ?? FALLBACK_MINUTE
  const end = minutesOf(range.endsAt) ?? FALLBACK_MINUTE
  const topPx = minutesToPixels(start, pxPerMin)
  const heightPx = minutesToPixels(end - start, pxPerMin)
  const compact = end - start <= SNAP_MINUTES
  const size = compact ? 'compact' : 'normal'
  const style: CSSProperties = {
    '--block-top': pxValue(topPx),
    '--block-height': pxValue(heightPx),
    '--block-pad-y': pxValue(BLOCK_PADDING_PX[size]),
    '--time-line': pxValue(TIME_LINE_HEIGHT_PX[size]),
    '--note-line': pxValue(NOTE_LINE_HEIGHT_PX[size]),
    '--block-gap': pxValue(BLOCK_GAP_PX[size]),
    '--note-lines': noteLines(heightPx, compact),
  }

  return { style, compact }
}

// blockGeometry is the one place a range's clock time becomes the block's pixel position,
// size, and compact-metric CSS variables — Block itself never computes geometry.
