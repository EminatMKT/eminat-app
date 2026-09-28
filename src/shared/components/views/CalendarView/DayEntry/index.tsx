'use client'
import type { CalendarItem } from '@/shared/components/views/types'
import Pressable from '@/shared/components/ui/Pressable'
import s from '../DayCell/index.module.css'

type Props = {
  item: CalendarItem
  onItemSelect: (id: string) => void
}

export default function DayEntry({ item, onItemSelect }: Props) {
  const look = item.tone ? `${s.entry} ${s[item.tone]}` : s.entry
  return (
    <Pressable accessibleLabel={item.accessibleLabel} hint={item.accessibleLabel}
      className={look} onClick={() => onItemSelect(item.id)}>{item.label}</Pressable>
  )
}

// One record on a day: a thin chip that cuts its label and gives the whole text to hover and to
// the screen reader. Its tone comes from the feature as a neutral word; the chip only draws it.
