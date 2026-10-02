'use client'
import type { ReactNode } from 'react'
import Pressable from '../Pressable'
import s from './index.module.css'

type Props = {
  actionIcon?: ReactNode
  actionLabel?: string
  actionPressed?: boolean
  checked: boolean
  label: string
  onAction?: () => void
  onChecked: (checked: boolean) => void
}

/** Checklist option with an optional stateful action; callers own domain labels and icons. */
export default function ChecklistChoice(props: Props) {
  const { actionIcon, actionLabel, actionPressed, checked, label, onAction, onChecked } = props
  const itemClass = checked ? `${s.choice} ${s.checked}` : s.choice
  const showAction = checked && actionIcon && actionLabel && onAction
  return (
    <li className={itemClass}>
      <label className={s.label}>
        <input type="checkbox" checked={checked} onChange={e => onChecked(e.target.checked)} />
        <span>{label}</span>
      </label>
      {showAction && (
        <Pressable accessibleLabel={actionLabel} className={s.action} pressed={actionPressed} onClick={onAction}>
          {actionIcon}
        </Pressable>
      )}
    </li>
  )
}

// ChecklistChoice owns the shared checkbox/action markup; callers own domain state and labels.
