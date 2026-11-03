import type { Usuario } from '@/shared/context/loadAppData'

interface Cargo {
  codigo: string
  nombre: string
}

interface UsuarioCargo {
  cargos?: Cargo | null
}

// Canonical Usuario fields (Pick) plus auth_id and the N:N usuario_cargos embed, which
// aren't part of the canonical row.
type RosterUser = Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'email' | 'online_at' | 'color'> & {
  auth_id?: string | null
  usuario_cargos?: UsuarioCargo[]
}

export type Props = {
  user: RosterUser
  esLider: boolean
}
