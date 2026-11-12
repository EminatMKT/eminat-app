import now from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/NowLine/use-now/start-ticking/clock'
import { ONLINE_WINDOW_MS } from '@/shared/constants/domain'
import { AVATAR_STATUS } from '../constants'
import type {
  AvatarStatus,
  Heartbeat,
  Presence,
  RosterUser,
} from '../types'

function isRecentlyOnline(onlineAt: string | null | undefined): boolean {
  if (!onlineAt) return false

  const windowStart = now().getTime() - ONLINE_WINDOW_MS

  return new Date(onlineAt).getTime() > windowStart
}

function statusOf(heartbeat: Heartbeat): AvatarStatus {
  if (!heartbeat.hasAccount) return AVATAR_STATUS.unregistered

  return heartbeat.isOnline ? AVATAR_STATUS.online : AVATAR_STATUS.offline
}

export default function presenceOf(user: RosterUser): Presence {
  const heartbeat: Heartbeat = {
    hasAccount: !!user.auth_id,
    isOnline: isRecentlyOnline(user.online_at),
  }

  return { ...heartbeat, status: statusOf(heartbeat) }
}

// Derives a roster member's presence once: whether they have an auth account, whether their
// heartbeat landed inside the card's ONLINE_WINDOW_MS, and the Avatar status dot that follows.
// No account wins over the heartbeat: a member who never signed in shows as unregistered.
