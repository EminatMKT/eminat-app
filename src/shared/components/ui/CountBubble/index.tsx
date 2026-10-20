import s from '@/shared/components/ui/CountBubble/index.module.css'
import { MAX_DISPLAY, OVERFLOW_SUFFIX } from './constants'

type Props = {
  count: number
  title?: string
}

/** A red bubble with a count, capped at `MAX_DISPLAY+`; draws nothing when there is nothing to count. `title` is its hover tooltip. */
export default function CountBubble({ count, title }: Props) {
  const hidden = count <= 0
  if (hidden) return null
  const overflows = count > MAX_DISPLAY
  const text = overflows ? `${MAX_DISPLAY}${OVERFLOW_SUFFIX}` : String(count)
  return <span className={s.badge} title={title}>{text}</span>
}

// Draws the count bubble shared by the notifications bell and tab labels. It does not position
// itself: each caller wraps it, inline after a label or pinned to a corner.
