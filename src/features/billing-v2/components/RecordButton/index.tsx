'use client'
import type { ReactNode } from 'react'
import { Pressable } from '@/shared/components/ui'
import s from './index.module.css'

type Props = {
  /** The whole record, as a screen reader says it. */
  accessibleLabel: string
  /** A reminder card, or the month's note above the calendar. */
  look: 'card' | 'note'
  onPress: () => void
  /** What the surface draws: the card's fields, or the note's line. */
  children: ReactNode
}

export default function RecordButton({ accessibleLabel, look, onPress, children }: Props) {
  return <Pressable accessibleLabel={accessibleLabel} className={s[look]} onClick={onPress}>{children}</Pressable>
}

// A billing record drawn as a surface that opens it in the editor. The reminder card and the
// month note were the same surface with a different skin, so the surface is written once and the
// skin is a prop: both answer the pointer with a hover and the keyboard with the same visible
// change, because both open something. What they draw inside is the caller's.
