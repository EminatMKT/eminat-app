import { describe, it, expect } from 'vitest'
import type { Participante } from '@/features/reuniones/types'
import { filaExterna, filaInterna, nombreDeParticipante } from './index'

const externo: Participante = {
  id: 'p2', reunion_id: 'r1', usuario_id: null, invitado_nombre: 'María Coello',
  invitado_empresa: 'Ornella', invitado_email: null,
  rol_en_reunion: 'invitado', asistencia: 'presente',
}
const interno: Participante = { ...externo, id: 'p1', usuario_id: 'u1', invitado_nombre: null, invitado_empresa: null }

describe('filasDeParticipante', () => {
  // El CHECK `interno_xor_externo` rechaza la fila que trae los dos o ninguno.
  it('un interno viaja sin nombre de invitado', () => {
    expect(filaInterna('r1', 'u1')).toMatchObject({ usuario_id: 'u1', invitado_nombre: null })
  })

  it('un externo viaja sin usuario_id', () => {
    const fila = filaExterna('r1', { nombre: ' María Coello ', empresa: 'Ornella', email: 'm@x.com' })
    expect(fila).toMatchObject({ usuario_id: null, invitado_nombre: 'María Coello', rol_en_reunion: 'invitado' })
  })

  // '' no es lo mismo que no saber de dónde viene: una consulta `IS NULL` los cuenta distinto.
  it('los campos vacíos de un externo van en NULL, no en cadena vacía', () => {
    const fila = filaExterna('r1', { nombre: 'Sin datos', empresa: '  ', email: '' })
    expect(fila).toMatchObject({ invitado_empresa: null, invitado_email: null })
  })
})

describe('nombreDeParticipante', () => {
  it('un interno sale del directorio', () => {
    expect(nombreDeParticipante(interno, { u1: 'Freddy Crespín' }, '—')).toBe('Freddy Crespín')
  })

  it('un externo sale de su propia fila', () => {
    expect(nombreDeParticipante(externo, {}, '—')).toBe('María Coello')
  })

  // Un interno que se dio de baja: la FK es ON DELETE SET NULL, así que la fila sobrevive sin
  // nombre. Mostrar "undefined" en un acta es peor que decir que no se sabe quién era.
  it('cae al texto de reserva cuando el directorio ya no lo tiene', () => {
    expect(nombreDeParticipante(interno, {}, 'Sin nombre')).toBe('Sin nombre')
  })
})
