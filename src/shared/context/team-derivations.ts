// Deriva la data de equipo desde `usuarios` reales.
import { normalizeRole, getModulesForRole, MODULE, type RoleModuleMap } from '@/shared/auth/permissions'

type U = {
  id?: string | null
  nombre?: string | null
  apellido?: string | null
  activo?: boolean | null
  rol?: string | null
  equipos?: { departamentos?: { codigo?: string | null } | null } | null
}

const esMarketing = (u: U) => u.equipos?.departamentos?.codigo === 'MKT'

const nombreCompleto = (u: U) => `${u.nombre || ''} ${u.apellido || ''}`.trim()

// id -> "Nombre Apellido", para mostrar responsable y solicitante en actividades.
// Incluye a TODOS (activos o no) para que las tareas viejas de gente inactiva
// sigan resolviendo el nombre.
export function deriveMiembrosPorId(usuarios: U[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const u of usuarios) if (u.id && u.nombre) map[u.id] = nombreCompleto(u)
  return map
}

// Asignables a una tarea de Stratix: activos que tienen el módulo. El permiso se
// pregunta, no se deduce del organigrama (ver codigo.md).
//
// Antes filtraba por `equipos.departamentos.codigo === 'MKT'`, y ese filtro dejaba
// el select de responsable vacío o incompleto para todo activo sin `equipo_id` —
// que es el estado por defecto de cualquier alta del panel admin— o cuyo equipo
// cuelga de otro departamento. No fallaba: simplemente no ofrecía a la persona.
export function deriveMiembrosAsignables(
  usuarios: U[],
  roleModuleMap: RoleModuleMap,
): { id: string; nombre: string }[] {
  return usuarios
    .filter((u) => u.activo && u.id)
    .filter((u) => getModulesForRole(roleModuleMap, normalizeRole(u.rol)).includes(MODULE.STRATIX_MKT))
    .map((u) => ({ id: u.id as string, nombre: nombreCompleto(u) }))
}

// Miembros del equipo de marketing para la pestaña Team (lista plana).
export function deriveEquipoMarketing<T extends U>(usuarios: T[]): T[] {
  return usuarios.filter((u) => u.activo && esMarketing(u))
}
