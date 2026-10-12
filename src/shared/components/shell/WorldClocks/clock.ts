export const WORLD_ZONES = [
  { label: 'Miami', timeZone: 'America/New_York' },
  { label: 'España', timeZone: 'Europe/Madrid' },
  { label: 'Ecuador', timeZone: 'America/Guayaquil' },
  { label: 'Venezuela', timeZone: 'America/Caracas' },
  { label: 'Costa Rica', timeZone: 'America/Costa_Rica' },
  { label: 'Cuba', timeZone: 'America/Havana' },
  { label: 'México', timeZone: 'America/Mexico_City' },
] as const

export type TimeAnchor = { utcMs: number; monotonicMs: number }

export function serverTimeAnchor(utcMs: unknown, sentAt: number, receivedAt: number): TimeAnchor | null {
  if (typeof utcMs !== 'number' || !Number.isFinite(utcMs) || Math.abs(utcMs) > 8.64e15 || receivedAt < sentAt) return null
  return { utcMs: utcMs + (receivedAt - sentAt) / 2, monotonicMs: receivedAt }
}

/** Advance with monotonic elapsed time; changing the device wall clock cannot shift a synced clock. */
export function anchoredUtc(anchor: TimeAnchor, monotonicMs: number) {
  return new Date(anchor.utcMs + Math.max(0, monotonicMs - anchor.monotonicMs))
}

export function worldTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
}
