'use client'
import RosterDetails from './RosterDetails'
import RosterIdentity from './RosterIdentity'
import RosterLeaderBadge from './RosterLeaderBadge'
import cardClassOf from './card-class'
import presenceOf from './roster-presence'
import type { CardState, Props } from './types'

export default function RosterCard({ user, esLider }: Props) {
  const presence = presenceOf(user)
  const card: CardState = { esLider, presence }

  return <div className={cardClassOf(card)}>
    {esLider && <RosterLeaderBadge />}
    <RosterIdentity user={user} status={presence.status} />
    <RosterDetails user={user} presence={presence} />
  </div>
}

// One member's card in the Stratix 360 marketing roster: leader badge, avatar with presence dot,
// name and positions, email line, and a footer with presence and in-progress workload.
// Presence (auth account + heartbeat inside the shared online window) is derived once here and
// handed down, so every child only renders.
