import { MESES } from '@/shared/context/AppContext'
import { ESTADO } from '@/shared/constants/domain'
import type { Actividad, NuevaActForm } from '../types'

// Mapea una actividad existente al formulario "New task" para reusar ese modal
// en modo edición. Los campos numéricos llegan de la DB como number|string y el
// form trabaja con strings; los nulos caen a ''. Un `mes` fuera del catálogo
// (dato legacy) cae al mes actual: dejarlo pasar haría que el select muestre
// otra cosa distinta a lo que se guardaría (el hueco documentado en el modal).
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))

export const actividadAForm = (a: Actividad): NuevaActForm => ({
  titulo: str(a.titulo),
  descripcion: str(a.descripcion),
  empresa: str(a.empresa),
  responsable_id: str(a.responsable_id),
  mes: a.mes && MESES.includes(a.mes) ? a.mes : MESES[new Date().getMonth()],
  horas: str(a.horas),
  dias_produccion: str(a.dias_produccion),
  estado: a.estado || ESTADO.PENDIENTE,
  fecha_entrega: str(a.fecha_entrega),
  solicitante_id: str(a.solicitante_id),
  drive_url: str(a.drive_url),
})
