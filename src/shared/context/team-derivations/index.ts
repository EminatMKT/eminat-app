// Deriva la data de equipo desde `usuarios` reales.
import { normalizeRole, getModulesForRole, MODULE, type RoleModuleMap } from '@/shared/auth/permissions'
import type { U } from './tipos'

const esMarketing = ({ equipos }: U) => equipos?.departamentos?.codigo === 'MKT'

const nombreCompleto = ({ nombre, apellido }: U) => `${nombre || ''} ${apellido || ''}`.trim()

// id -> "Nombre Apellido", para mostrar responsable y solicitante en actividades.
// Incluye a TODOS (activos o no) para que las tareas viejas de gente inactiva
// sigan resolviendo el nombre.
export function deriveMiembrosPorId(usuarios: U[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const u of usuarios) if (u.id && u.nombre) map[u.id] = nombreCompleto(u)
  return map
}

// Asignables a una tarea: activos que tienen el módulo `tasks`. El permiso se
// pregunta, no se deduce del organigrama (ver codigo.md) — filtrar por el depto
// MKT dejaba afuera a todo activo sin `equipo_id`, el estado por defecto de un
// alta del panel admin. No fallaba: simplemente no ofrecía a la persona.
//
// Esto NO es quién VE las tareas: eso lo decide la RLS, que no corta por
// departamento. Es a quién se le puede asignar una.
//
// ⚠️ Y es TAMBIÉN quién aparece en el reporte de pago: sale de acá, pasa por
// `useTablero.idsTeam` y llega al `<select>` de `useReporte`. **Darle el módulo
// `tasks` a un rol lo vuelve asignable y liquidable a la vez.** Es deliberado:
// son la misma pregunta, y dos gates eran la forma de que se desincronizaran.
//
// Decía `MODULE.STRATIX_MKT`, cierto sólo mientras las tareas fueran de
// marketing: con otro departamento en el mismo tablero, el select de responsable
// no habría ofrecido a su propia gente.
export function deriveMiembrosAsignables(
  usuarios: U[],
  roleModuleMap: RoleModuleMap,
): { id: string; nombre: string }[] {
  return usuarios
    .filter((u) => u.activo && u.id)
    .filter((u) => getModulesForRole(roleModuleMap, normalizeRole(u.rol)).includes(MODULE.TASKS))
    .map((u) => ({ id: u.id as string, nombre: nombreCompleto(u) }))
}

// Miembros del equipo de marketing para la pestaña Team (lista plana).
export function deriveEquipoMarketing<T extends U>(usuarios: T[]): T[] {
  return usuarios.filter((u) => u.activo && esMarketing(u))
}
