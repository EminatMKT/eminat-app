import { supabase } from '@/shared/db'
import type { Reunion, ReunionForm } from '@/features/reuniones/types'
import { TABLES } from '../tables'

// Un <input> vacío da `''`, y `''` NO es NULL para Postgres. Con `time` ni siquiera llega a
// guardarse: aborta con `invalid input syntax for type time: ""`. Y donde sí entra —`lugar`,
// `objetivo`— dejaría la cadena vacía, que no es lo mismo que no tener lugar: cualquier consulta
// que pregunte `IS NULL` los contaría distinto. La frontera entre el formulario y la base es
// este helper, y por eso vive acá y no en el componente.
const oNull = (v: string) => v.trim() || null

export const list = () =>
  supabase.from(TABLES.reuniones).select('*').order('fecha', { ascending: false })

export const byId = (id: string) =>
  supabase.from(TABLES.reuniones).select('*').eq('id', id).single()

// `codigo` y `estado` no viajan: el primero lo pone el trigger y el segundo tiene su DEFAULT.
// Los campos se listan uno por uno en vez de esparcir `...form`, así se ve qué se manda y un
// campo que alguien agregue al formulario no llega a la base sin que nadie lo decida.
export const insert = (form: ReunionForm, createdBy: string | null) => {
  // Nueve campos no entran en la firma sin volverla un párrafo, así que la desestructuración va
  // en la primera línea del cuerpo (rules/codigo.md · "Un parámetro objeto se desestructura").
  const { empresa, titulo, fecha, modalidad, tipo, lugar, objetivo, hora_inicio, hora_fin } = form

  return supabase.from(TABLES.reuniones)
    .insert({
      empresa,
      titulo: titulo.trim(),
      fecha,
      // `modalidad` es NOT NULL y del DOMAIN, así que no admite ni '' ni null. `validarReunion`
      // ya garantiza que venga elegida; omitirla es el estrechamiento que TypeScript necesita
      // para el caso que no puede pasar, no un default de negocio escondido acá.
      modalidad: modalidad || undefined,
      tipo: oNull(tipo),
      lugar: oNull(lugar),
      objetivo: oNull(objetivo),
      hora_inicio: oNull(hora_inicio),
      hora_fin: oNull(hora_fin),
      created_by: createdBy,
    })
    .select().single()
}

export const update = (id: string, patch: Partial<Reunion>) =>
  supabase.from(TABLES.reuniones).update(patch).eq('id', id).select().single()
