import type { PostgrestError } from '@supabase/supabase-js'
import type { Fallo } from '@/features/reuniones/types'

// Traduce lo que rechazó la base a algo que una persona pueda leer. La base es la única que sabe
// que la misma persona ya estaba en la mesa —el UNIQUE `participante_unico`—, así que el mensaje
// tiene que nacer de su error y no de una validación paralela en el cliente, que se desincroniza.
//
// 23505 es la violación de UNIQUE de Postgres, y en `reunion_participantes` sólo puede ser ésa.
// Lo demás cae al detalle crudo a propósito: es un bug, y esconderlo detrás de "algo salió mal"
// obliga a abrir la consola para saber qué pasó.
export const falloDe = (e: PostgrestError): Fallo =>
  e.code === '23505'
    ? { key: 'reuniones.error.participanteRepetido' }
    : { key: 'common.errorWithDetail', vars: { detail: e.message } }
