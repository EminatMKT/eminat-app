// Deriva la data de equipo desde `usuarios` reales.

type U = {
  id?: string | null
  nombre?: string | null
  apellido?: string | null
  activo?: boolean | null
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

// Equipo de marketing asignable: activos del departamento Marketing. Antes exigía
// además `responsable_ref`, y ese filtro dejaba fuera a las tres personas que nunca
// tuvieron ref — no eran asignables por un artefacto del esquema, no por una regla.
export function deriveMiembrosAsignables(usuarios: U[]): { id: string; nombre: string }[] {
  return usuarios
    .filter((u) => u.activo && u.id && esMarketing(u))
    .map((u) => ({ id: u.id as string, nombre: nombreCompleto(u) }))
}

// Miembros del equipo de marketing para la pestaña Team (lista plana).
export function deriveEquipoMarketing<T extends U>(usuarios: T[]): T[] {
  return usuarios.filter((u) => u.activo && esMarketing(u))
}
