'use client'
import type { MouseEvent, ReactNode } from 'react'
import s from '../index.module.css'

type Props = {
  id: string
  multiple: boolean
  hasRows: boolean
  empty: ReactNode
  children: ReactNode
}

// A press inside the panel must not move focus off the box: the keys keep working there.
const keepFocus = (event: MouseEvent) => event.preventDefault()

export default function Panel(props: Props) {
  const { id, multiple, hasRows, empty, children } = props
  return (
    <ul className={s.panel} id={id} role="listbox" aria-multiselectable={multiple || undefined} onMouseDown={keepFocus}>
      {children}
      {!hasRows && <li className={s.vacio}>{empty}</li>}
    </ul>
  )
}

// The list that drops under the box: the rows, or the empty message when nothing is shown.
