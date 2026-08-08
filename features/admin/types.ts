import type { Usuario } from '@/shared/context/loadAppData'

export type StatusOverride = '' | 'aprobado' | 'finalizado' | 'por_aprobar'

export type ReassignState = {
  taskCount: number
  heirId: string
  statusOverride: StatusOverride
}

export type ResetTarget = { id: string; nombre: string; email: string }

// Usuario tal como lo trae adminUsuarios del contexto (subconjunto de columnas
// que usa el módulo admin). Deriva de la fila canónica `Usuario` vía Pick para no
// re-listar campos a mano; `tipo` es el único campo extra que no vive en Usuario.
export type AdminUser = Pick<
  Usuario,
  'id' | 'nombre' | 'apellido' | 'email' | 'rol' | 'color' | 'ubicacion' | 'empresa_id' | 'activo' | 'validado' | 'responsable_ref' | 'equipo_id' | 'usuario_cargos'
> & { tipo?: string }
