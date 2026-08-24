// Actividad de marketing (tabla `actividades`). Tipo canónico definido en el
// contexto compartido (una sola fuente de forma); se re-exporta acá para que las
// vistas de Stratix lo importen desde '../types' como siempre.
export type { Actividad } from '@/shared/context/loadAppData'

// Resumen de horas/tareas por miembro (lo computa useStratixData.resumenHoras;
// lo consume HoursSummaryCard).
export type ResumenHoras = { id: string; nombre: string; total: number; completadas: number; horas: number; dias: number }

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
