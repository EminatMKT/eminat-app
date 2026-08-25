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

// Guardar una edición pide confirmación, pero solo si hay algo que pisar: sin esto, abrir el
// editor y cerrarlo con el botón de guardar preguntaba igual, y una confirmación que aparece
// cuando no pasa nada es la que después se aprieta sin leer.
// Se compara el FORM contra el mapeo del original —no la Actividad cruda— porque el form es lo
// que el usuario ve y lo que se va a escribir. El título va trimeado en los dos lados: el
// payload lo trimea al guardar, así que un espacio al final no es un cambio, no se guardaría.
export const hayCambios = (form: NuevaActForm, original: Actividad): boolean => {
  const base = actividadAForm(original)
  const campos = Object.keys(base) as (keyof NuevaActForm)[]
  return campos.some(k => (k === 'titulo' ? form[k].trim() !== base[k].trim() : form[k] !== base[k]))
}
