import type { Weekday } from '@/features/tasks/utils/availability'

/** The team an `AvailabilityMemberDto` belongs to, or the jornada it declares hours against. */
export type AvailabilityTeamDto = { id: string; name: string }

/** `null` when the member has no jornada or theirs is inactive — never a stale reference. */
export type AvailabilityWorkdayDto = { id: string; name: string; hoursPerDay: number }

/** One recurring weekly range as the API serializes it: canonical `HH:mm` strings, never the
 *  `HH:mm:ss` shape Postgres' `time` columns return. */
export type AvailabilityRangeDto = {
  id: string
  weekday: Weekday
  startsAt: string
  endsAt: string
  note: string | null
}

/** One member the viewer may see on the weekly availability screen. `canEdit` is true only for
 *  the viewer's own row: the self-replace RPC never lets anyone touch another member's rows. */
export type AvailabilityMemberDto = {
  id: string
  name: string
  team: AvailabilityTeamDto | null
  workday: AvailabilityWorkdayDto | null
  ranges: AvailabilityRangeDto[]
  canEdit: boolean
}

/** `GET /api/tasks/availability`'s body: same-team members for a regular user, every active
 *  Tasks user for an admin, or just the viewer when they carry no team. */
export type AvailabilityResponse = {
  viewerUserId: string
  members: AvailabilityMemberDto[]
}

/** One range as sent to `PUT /api/tasks/availability` — shares its shape with
 *  `AvailabilityRangeDto` minus the server-assigned `id`, with `note` optional on input. */
export type SaveOwnAvailabilityRange = Omit<AvailabilityRangeDto, 'id' | 'note'> & { note?: string | null }

/** `PUT /api/tasks/availability`'s body: always the caller's OWN ranges — there is no field for a
 *  target user, by design, since the underlying RPC only ever replaces the caller's own rows. */
export type SaveOwnAvailabilityRequest = {
  ranges: SaveOwnAvailabilityRange[]
}
