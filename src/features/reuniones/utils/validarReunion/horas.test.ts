import { describe, it, expect } from 'vitest'
import type { ReunionForm } from '@/features/reuniones/types'
import { validarReunion } from './index'

const OK: ReunionForm = {
  empresa: 'EMC', titulo: 'Semanal', tipo: 'seguimiento', lugar: '',
  modalidad: 'presencial', fecha: '2026-08-29', hora_inicio: '09:00', hora_fin: '10:00', objetivo: '',
}

// Las horas van en su propia suite: son la única regla del formulario que RELACIONA dos campos,
// y es la misma que el CHECK `horas_coherentes` de la tabla. Se valida acá además de allá para
// que el usuario vea un mensaje traducido en vez del error crudo de Postgres.
describe('validarReunion · las horas', () => {
  it('la de fin no puede ser anterior a la de inicio', () => {
    expect(validarReunion({ ...OK, hora_fin: '08:00' })).toContain('reuniones.error.horas')
  })

  // El CHECK de la base usa `>=`, así que esto tiene que pasar en los dos lados o el formulario
  // rechazaría algo que la tabla acepta.
  it('horas iguales pasan: una reunión de duración cero es rara, no inválida', () => {
    expect(validarReunion({ ...OK, hora_fin: '09:00' })).toEqual([])
  })

  it('las dos vacías no son un error: son opcionales', () => {
    expect(validarReunion({ ...OK, hora_inicio: '', hora_fin: '' })).toEqual([])
  })

  it('sólo una cargada tampoco: no hay con qué comparar', () => {
    expect(validarReunion({ ...OK, hora_fin: '' })).toEqual([])
    expect(validarReunion({ ...OK, hora_inicio: '' })).toEqual([])
  })
})
