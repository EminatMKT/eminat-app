// La forma mínima de un usuario que estas derivaciones necesitan. Todo opcional y nullable
// porque la fila llega de Postgres tal cual: quien no tiene equipo trae `equipos: null`, y ese
// es el caso normal, no el raro.
//
// Los dos niveles del embed van con nombre y no anidados adentro de `U`: anidados, la firma
// dice `{ departamentos?: { codigo?: ... } }` y hay que desarmarla de memoria para saber que
// eso es un equipo con su departamento.
export type Departamento = { codigo?: string | null }

export type Equipo = { departamentos?: Departamento | null }

export type U = {
  id?: string | null
  nombre?: string | null
  apellido?: string | null
  activo?: boolean | null
  rol?: string | null
  equipos?: Equipo | null
}
