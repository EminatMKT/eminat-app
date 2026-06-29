export type StatusOverride = '' | 'aprobado' | 'finalizado' | 'por_aprobar'

export type ReassignState = {
  taskCount: number
  heirId: string
  statusOverride: StatusOverride
}

export type ResetTarget = { id: string; nombre: string; email: string }

// Usuario tal como lo trae adminUsuarios del contexto (campos usados por el módulo).
export type AdminUser = {
  id: string
  nombre?: string
  apellido?: string
  email?: string
  rol?: string
  tipo?: string
  color?: string
  ubicacion?: string
  empresa?: string
  cargo?: string
  activo?: boolean
  validado?: boolean
  responsable_ref?: string | null
}
