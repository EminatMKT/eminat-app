import { ITEM_PART } from './constants'
import type { AvailabilityRangeItemFrameProps } from './types'
import s from '../index.module.css'

export default function AvailabilityRangeItemFrame(props: AvailabilityRangeItemFrameProps) {
  const { part, children } = props

  if (part === ITEM_PART) return <li className={s.item}>{children}</li>

  return <div className={s[part]}>{children}</div>
}

// The layout of one availability range item, as one element with a skin per piece, so
// AvailabilityRangeItem itself only composes components (markup_dibujado), the same idiom as
// CrashFrame and TopbarLayout.
