'use client'
import { Pressable } from '@/shared/components/ui'
import s from './index.module.css'

type Props = {
  /** The whole line, drawn and announced alike. */
  said: string
  /** A row of a reminder list, or the month's note above the calendar. */
  look: 'item' | 'note'
  onPress: () => void
}

export default function RecordButton({ said, look, onPress }: Props) {
  return <Pressable accessibleLabel={said} className={s[look]} onClick={onPress}>{said}</Pressable>
}

// A billing record drawn as one line of text that opens it. The reminder row and the month note
// were the same surface with a different skin, so the surface is written once and the skin is a
// prop. What the line says, and which record opens, is decided by whoever uses it.
