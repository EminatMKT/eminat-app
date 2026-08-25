// Los dos criterios con los que se filtra el directorio. Van juntos en un tipo porque van
// juntos en el estado: se aplican sobre la misma lista y se limpian de una.
export type DirectorioCriterios = {
  busqueda: string
  departamento: string
}

// Forma de un miembro del directorio (ver DIRECTORIO_DATA en shared/context/AppContext).
export type Member = {
  nombre: string
  nickname?: string
  cargo: string
  email: string
  ubicacion: string
  credenciales?: string
  departamento: string
  empresa: string
  color: string
}
