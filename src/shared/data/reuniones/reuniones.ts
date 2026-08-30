import { supabase } from '@/shared/db'
import type { ReunionForm } from '@/features/reuniones/types'
import { TABLES } from '../tables'

// Un <input> vacío da `''`, y `''` NO es NULL para Postgres: con `time` aborta con `invalid input
// syntax for type time: ""`, y donde sí entra —`lugar`, `objetivo`— guardaría la cadena vacía,
// que no es lo mismo que no tener lugar. La frontera entre formulario y base es este helper.
const oNull = (v: string) => v.trim() || null

export const list = () =>
  supabase.from(TABLES.reuniones).select('*').order('fecha', { ascending: false })

export const byId = (id: string) =>
  supabase.from(TABLES.reuniones).select('*').eq('id', id).single()

// `codigo` y `estado` no viajan: el primero lo pone el trigger y el segundo tiene su DEFAULT. Los
// campos se listan uno por uno en vez de esparcir `...form`, así un campo que alguien agregue al
// formulario no llega a la base sin que nadie lo decida. Es UNA función porque crear y editar
// mandan lo mismo: escrita dos veces, una columna nueva entraría en una y no en la otra.
// Nueve campos no entran en la firma sin volverla un párrafo, así que la desestructuración va en
// la primera línea del cuerpo (rules/codigo.md · "Un parámetro objeto se desestructura").
const filaDesde = (form: ReunionForm) => {
  const { empresa, titulo, fecha, modalidad, tipo, lugar, objetivo, hora_inicio, hora_fin } = form

  const fila = {
    empresa,
    titulo: titulo.trim(),
    fecha,
    // `modalidad` es NOT NULL y del DOMAIN: no admite ni '' ni null. `validarReunion` ya garantiza
    // que venga elegida; omitirla es el estrechamiento para el caso que no puede pasar, no un
    // default de negocio escondido acá.
    modalidad: modalidad || undefined,
    tipo: oNull(tipo),
    lugar: oNull(lugar),
    objetivo: oNull(objetivo),
    hora_inicio: oNull(hora_inicio),
    hora_fin: oNull(hora_fin),
  }
  return fila
}

export const insert = (form: ReunionForm, createdBy: string | null) =>
  supabase.from(TABLES.reuniones)
    .insert({ ...filaDesde(form), created_by: createdBy })
    .select().single()

// Editar es pisar lo que había: quien la llama pregunta antes (rules/ui.md · "Todo proceso
// destructivo lleva confirmación").
export const updateForm = (id: string, form: ReunionForm) =>
  supabase.from(TABLES.reuniones).update(filaDesde(form)).eq('id', id).select().single()
