'use client'
import type { ReactNode, SyntheticEvent } from 'react'
import s from './index.module.css'

type Props = {
  /** The DOM `id`, so the input can point at it with `aria-activedescendant`. */
  id: string
  label: string
  /** It is the one confirming now would pick: the keyboard or the mouse highlights it. */
  marked: boolean
  /** The combobox's fixed option, on top of everything: bold so it stands apart. */
  pinned?: boolean
  /** Multiple mode only: whether the option is in. Absent in a single combobox. */
  checked?: boolean
  /** A control of the option itself, beside its label (the leader crown). */
  action?: ReactNode
  onPick: () => void
}

const NO_CLASS = ''
const keepOff = (event: SyntheticEvent) => event.stopPropagation()

export default function Option(props: Props) {
  const { id, label, marked, pinned = false, checked, action, onPick } = props
  const multiple = checked !== undefined
  const selected = multiple ? checked : marked
  const name = multiple ? label : undefined
  const markedClass = marked ? s.marcado : NO_CLASS
  const pinnedClass = pinned ? s.fija : NO_CLASS
  return (
    <li id={id} role="option" aria-selected={selected} aria-label={name} onPointerDown={onPick}
      className={`${s.item} ${markedClass} ${pinnedClass}`}>
      {multiple && <span className={s.casilla} data-checked={checked} aria-hidden />}
      {label}
      {action && <span className={s.accion} onPointerDown={keepOff}>{action}</span>}
    </li>
  )
}

// A row of the combobox list. It is picked on `onPointerDown`, not `onClick`, because the click
// lands after the input's `blur`. In multiple mode `aria-selected` says whether the option is in
// —the highlight is `aria-activedescendant`'s job— and the accessible name is the label alone, so
// the action inside does not leak into it. The action stops its own press from picking the row.
