import { describe, it, expect } from 'vitest'
import type { PostgrestError } from '@supabase/supabase-js'
import { falloDe } from './index'

// La forma exacta que devuelve supabase-js, `toJSON` incluido: sin él el fixture no tipa.
const error = (code: string, message: string): PostgrestError => {
  const crudo = { name: 'PostgrestError', message, details: '', hint: '', code }
  return { ...crudo, toJSON: () => crudo }
}

describe('falloDe', () => {
  it('el UNIQUE de participante se cuenta con una frase, no con el texto de Postgres', () => {
    const e = error('23505', 'duplicate key value violates unique constraint "participante_unico"')
    expect(falloDe(e)).toEqual({ key: 'reuniones.error.participanteRepetido' })
  })

  // Un CHECK rechazado (`interno_xor_externo`) es un bug del formulario, no algo que el usuario
  // pueda arreglar: esconderlo detrás de "algo salió mal" obliga a abrir la consola.
  it('cualquier otro error llega con su detalle', () => {
    const e = error('23514', 'violates check constraint "interno_xor_externo"')
    expect(falloDe(e)).toEqual({
      key: 'common.errorWithDetail',
      vars: { detail: 'violates check constraint "interno_xor_externo"' },
    })
  })
})
