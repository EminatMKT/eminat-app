/** A Supabase embed: one row, an array of rows, or nothing. */
export type Embedded<T> = T | T[] | null | undefined

/** A department as embedded under a team. */
export type MeetDepartmentRow = { id: string; codigo: string; nombre: string }

/** A team as embedded under a user. */
export type MeetTeamRow = {
  id: string
  codigo: string
  nombre: string
  activo?: boolean
  departamentos?: MeetDepartmentRow | MeetDepartmentRow[] | null
}

/** A user row as embedded by Supabase; the embed may come as one row or an array. */
export type MeetUserRow = {
  id: string
  nombre_display?: string | null
  nombre?: string | null
  apellido?: string | null
  rol?: string | null
  equipos?: MeetTeamRow | MeetTeamRow[] | null
}

/** One `actividad_responsables` row with its user embed. */
export type MeetResponsibleRow = { usuario_id: string; es_lider: boolean; usuarios?: MeetUserRow | MeetUserRow[] | null }

/** One responsible in a Meet response. */
export type CanonicalMeetResponsible = { id: string; nombre: string; es_lider: boolean }

/** A person reference in a Meet response. */
export type CanonicalMeetPerson = { id: string; nombre: string }

/** Responsible part of a Meet task; `responsable_id`/`responsable` are legacy fields carrying the principal. */
export type CanonicalResponsibles = {
  responsable_id: string | null
  responsable: CanonicalMeetPerson | null
  responsables: CanonicalMeetResponsible[]
  principal: MeetUserRow | null
}

/** Request fields: the legacy single id or the new array, plus an optional leader. */
export type ResponsiblesRequest = { responsable_id?: string; responsable_ids?: string[]; lider_id?: string | null }

/** Request responsibles reduced to one deduplicated set plus the leader. */
export type NormalizedResponsibles = { ids: string[]; leaderId: string | null }
