import type { Actividad, Usuario } from '@/shared/context/loadAppData'

interface Cargo {
  codigo: string
  nombre: string
}

interface UsuarioCargo {
  cargos?: Cargo | null
}

/** Canonical Usuario fields (Pick) plus auth_id and the N:N usuario_cargos embed, which
 *  aren't part of the canonical row. */
export type RosterUser = Pick<
  Usuario,
  'id' | 'nombre' | 'apellido' | 'email' | 'online_at' | 'color'
> & {
  auth_id?: string | null
  usuario_cargos?: UsuarioCargo[]
}

export type Props = {
  user: RosterUser
  esLider: boolean
}

/** Whether the member has an auth account and a heartbeat inside the online window. */
export type Heartbeat = {
  hasAccount: boolean
  isOnline: boolean
}

/** The Avatar status dot a roster member gets. */
export type AvatarStatus = 'unregistered' | 'online' | 'offline'

/** What the card shows about a member's account and heartbeat, derived once per render. */
export type Presence = Heartbeat & {
  status: AvatarStatus
}

/** What decides the card's outer classes: leader highlight and the no-account dimming. */
export type CardState = {
  esLider: boolean
  presence: Presence
}

/** The slice of an activity the workload count reads. */
export type WorkItem = Pick<Actividad, 'estado' | 'responsables'>
