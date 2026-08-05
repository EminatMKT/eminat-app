// Deriva la data de equipo desde `usuarios` reales (reemplaza los hardcodes
// MIEMBROS_REFS / ACTIVE_MIEMBROS_REFS / STRATIX360_ROSTER).

type U = {
  nombre?: string | null
  responsable_ref?: string | null
  activo?: boolean | null
  equipos?: { departamentos?: { codigo?: string | null } | null } | null
}

const esMarketing = (u: U) => u.equipos?.departamentos?.codigo === 'MKT'

// ref -> nombre, para mostrar el responsable en actividades. Incluye a TODOS los
// que tengan responsable_ref (activos o no) para que tareas viejas de gente
// inactiva (ej. Jonathan_CRM) sigan resolviendo el nombre.
export function deriveMiembrosRef(usuarios: U[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const u of usuarios) if (u.responsable_ref && u.nombre) map[u.responsable_ref] = u.nombre
  return map
}

// Equipo de marketing asignable: activos, departamento Marketing, con ref.
export function deriveMiembrosAsignables(usuarios: U[]): { ref: string; nombre: string }[] {
  return usuarios
    .filter((u) => u.activo && u.responsable_ref && esMarketing(u))
    .map((u) => ({ ref: u.responsable_ref as string, nombre: u.nombre as string }))
}

// Miembros del equipo de marketing para la pestaña Team (lista plana).
export function deriveEquipoMarketing<T extends U>(usuarios: T[]): T[] {
  return usuarios.filter((u) => u.activo && esMarketing(u))
}
