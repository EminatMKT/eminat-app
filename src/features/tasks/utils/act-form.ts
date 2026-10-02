import { ESTADO } from '@/shared/constants/domain'
import { localDate } from '@/shared/utils'
import type { Actividad, ActividadResponsable, NuevaActForm } from '../types'

// Mapea una actividad existente al formulario "New task" para reusar ese modal
// en modo edición. Los campos numéricos llegan de la DB como number|string y el
// form trabaja con strings; los nulos caen a ''. Una actividad sin `fecha_inicio`
// (no debería existir: la columna es NOT NULL) cae a hoy, que es el mismo
// default que pone la base.
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const responsables = (rows: ActividadResponsable[] | null | undefined): ActividadResponsable[] =>
  rows?.map(r => ({ usuario_id: r.usuario_id, es_lider: r.es_lider })) ?? []

const mismosResponsables = (a: ActividadResponsable[], b: ActividadResponsable[]) => {
  const firma = (rows: ActividadResponsable[]) =>
    rows.map(r => `${r.usuario_id}:${r.es_lider ? '1' : '0'}`).sort().join('|')
  return firma(a) === firma(b)
}

export const actividadAForm = (a: Actividad): NuevaActForm => {
  // Desestructurado adentro y no en la firma: son once campos, y una firma de once nombres deja
  // de leerse de un renglón. Así la lista dice de un vistazo qué llega al form y qué no.
  const { titulo, descripcion, empresa, fecha_inicio, horas, responsables: responsablesAct,
    dias_produccion, estado, fecha_entrega, solicitante_id, drive_url } = a
  const form: NuevaActForm = {
    titulo: str(titulo),
    descripcion: str(descripcion),
    empresa: str(empresa),
    responsables: responsables(responsablesAct),
    fecha_inicio: fecha_inicio || localDate(),
    horas: str(horas),
    dias_produccion: str(dias_produccion),
    estado: estado || ESTADO.PENDIENTE,
    fecha_entrega: str(fecha_entrega),
    solicitante_id: str(solicitante_id),
    drive_url: str(drive_url),
  }
  return form
}

/** Builds a new-task form from an existing task, resetting lifecycle-only fields. */
export const actividadAPlantilla = (a: Actividad): NuevaActForm => {
  const form = actividadAForm(a)
  return { ...form, estado: ESTADO.PENDIENTE }
}

// Guardar una edición pide confirmación, pero solo si hay algo que pisar: sin esto, abrir el
// editor y cerrarlo con el botón de guardar preguntaba igual, y una confirmación que aparece
// cuando no pasa nada es la que después se aprieta sin leer.
// Se compara el FORM contra el mapeo del original —no la Actividad cruda— porque el form es lo
// que el usuario ve y lo que se va a escribir. El título va trimeado en los dos lados: el
// payload lo trimea al guardar, así que un espacio al final no es un cambio, no se guardaría.
export const hayCambios = (form: NuevaActForm, original: Actividad): boolean => {
  const base = actividadAForm(original)
  const campos = Object.keys(base) as (keyof NuevaActForm)[]
  return campos.some(k => {
    if (k === 'responsables') return !mismosResponsables(form.responsables, base.responsables)
    return k === 'titulo' ? form[k].trim() !== base[k].trim() : form[k] !== base[k]
  })
}
