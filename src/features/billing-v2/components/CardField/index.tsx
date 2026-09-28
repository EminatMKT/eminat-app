import type { ReactNode } from 'react'
import s from './index.module.css'

type Props = {
  /** Which fixed place of a record card this field takes. */
  slot: 'date' | 'status' | 'concept' | 'payee' | 'amount' | 'marker'
  children: ReactNode
}

export default function CardField({ slot, children }: Props) {
  return <span className={s[slot]}>{children}</span>
}

// One field of a record card, in its fixed place. The place comes from the slot and not from
// the order the fields are written in, so every card lays its fields out the same way and the
// eye reads the list as columns: the dates down the left, the amounts down the right edge, the
// status always as the same badge.
//
// It is its own element because a view may draw at most two tags before it has to name what it
// is drawing (`markup_dibujado`): the card above composes six of these and no bare `<span>`.
