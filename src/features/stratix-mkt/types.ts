// Actividad de marketing (tabla `actividades`). Tipo canónico definido en el
// contexto compartido (una sola fuente de forma); se re-exporta acá para que las
// vistas de Stratix lo importen desde '../types' como siempre.
export type { Actividad } from '@/shared/context/loadAppData'
import type { Actividad } from '@/shared/context/loadAppData'

// Resumen de horas/tareas por miembro (lo computa useStratixData.resumenHoras;
// lo consume HoursSummaryCard).
export type ResumenHoras = { id: string; nombre: string; total: number; completadas: number; horas: number; dias: number }

// Los dos criterios de la vista de solicitudes. Van juntos porque se aplican juntos.
export type SolicitudesCriterios = {
  busqueda: string
  estado: string
}

// El formulario de tarea como UN estado: si está abierto, si está guardando, a cuál actividad
// edita (null = está creando) y los valores cargados. Eran cuatro useState sueltos y por eso
// cerrar el modal exigía acordarse de resetear los cuatro.
export type FormActividad = {
  abierto: boolean
  guardando: boolean
  editando: Actividad | null
  valores: NuevaActForm
}

// A quién y a qué mes se le hace el reporte. Van juntos: son los dos criterios del mismo
// período y se eligen en la misma barra.
export type ReporteCriterios = {
  mes: string
  miembroId: string
}

// Estado del formulario "New task".
export type NuevaActForm = {
  titulo: string
  descripcion: string
  empresa: string
  responsable_id: string
  mes: string
  horas: string
  dias_produccion: string
  estado: string
  fecha_entrega: string
  solicitante_id: string
  drive_url: string
}
