import type { Usuario, OrgRow } from '@/shared/context/loadAppData'

// De qué departamento es cada persona, navegando `usuarios.equipo_id → equipos.departamento_id`.
//
// Es LA razón por la que `actividades` no tiene una columna de departamento: «el departamento de
// la tarea» es «el departamento del responsable», `responsable_id` es obligatorio, y guardarlo
// aparte sería codificar un dato que ya existe por separado.
//
// Quien no tenga equipo, o cuyo equipo no tenga departamento, simplemente no está en el mapa: el
// filtro lo deja fuera y la ficha muestra «—». Reventar acá tiraría el tablero entero por un dato
// de catálogo incompleto, que es exactamente el estado en el que empieza esto (ver la fase 0).
export function departamentoPorUsuario(usuarios: Usuario[], equipos: OrgRow[]): Record<string, string> {
  const departamentoDelEquipo: Record<string, string> = {}
  for (const e of equipos) if (e.departamento_id) departamentoDelEquipo[e.id] = e.departamento_id

  const porUsuario: Record<string, string> = {}
  for (const u of usuarios) {
    const dep = u.equipo_id ? departamentoDelEquipo[u.equipo_id] : undefined
    if (dep) porUsuario[u.id] = dep
  }
  return porUsuario
}
