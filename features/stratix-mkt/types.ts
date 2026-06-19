// Actividad de marketing (tabla `actividades`). Index signature porque varias
// vistas leen campos opcionales y los registros vienen de Supabase.
export type Actividad = {
  id?: string
  titulo?: string
  descripcion?: string
  area_ref?: string
  responsable_ref?: string
  mes?: string
  trimestre?: string
  estado?: string
  horas?: number | string
  dias_produccion?: number | string
  fecha_entrega?: string
  solicitado_por?: string
  drive_url?: string
  [k: string]: unknown
}

// Estado del formulario "New task".
export type NuevaActForm = {
  titulo: string
  descripcion: string
  area_ref: string
  responsable_ref: string
  mes: string
  horas: string
  dias_produccion: string
  estado: string
  fecha_entrega: string
  solicitado_por: string
  drive_url: string
}
