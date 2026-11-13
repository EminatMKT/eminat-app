import { NO_TEXT } from '../constants'
import type { CardState } from '../types'
import s from '../index.module.css'

export default function cardClassOf(card: CardState): string {
  const leaderClass = card.esLider ? s.lider : NO_TEXT
  const noAccountClass = card.presence.hasAccount ? NO_TEXT : s.sinCuenta
  const className = `${s.card} ${leaderClass} ${noAccountClass}`

  return className
}

// The roster card's outer classes: the base card, the leader highlight and the dimming of a
// member without an account. Empty slots stay as spaces, exactly as the card always rendered.
