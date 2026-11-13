'use client'
import type { CSSProperties } from 'react'
import { PIXELS_PER_MINUTE } from '../geometry/constants'
import lineTop from './line-top'
import useNow from './use-now'
import type { LineTopInput, NowLineProps } from './types'
import s from './index.module.css'

/** The red line marking the current minute, drawn only on today's column. Decorative: the
 *  time it marks is already readable from the hour rows beside it. */
export default function NowLine({ weekday }: NowLineProps) {
  const input: LineTopInput = { current: useNow(), weekday, pxPerMin: PIXELS_PER_MINUTE }
  const top = lineTop(input)

  if (top === null) return null

  const style: CSSProperties = { '--now-top': `${top}px` }

  return <div className={s.line} style={style} aria-hidden="true" data-now-line />
}

// Nothing renders until the clock is read after mount, so server and hydrated markup agree.
