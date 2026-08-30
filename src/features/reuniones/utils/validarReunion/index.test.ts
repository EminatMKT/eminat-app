import { describe, it, expect } from 'vitest'
import type { ReunionForm } from '@/features/reuniones/types'
import { validarReunion } from './index'

const OK: ReunionForm = {
  empresa: 'EMC', titulo: 'Semanal', tipo: 'seguimiento', lugar: '',
  modalidad: 'presencial', fecha: '2026-08-29', hora_inicio: '09:00', hora_fin: '10:00', objetivo: '',
}

describe('validarReunion · lo obligatorio', () => {
  it('un formulario completo no tiene errores', () => {
    expect(validarReunion(OK)).toEqual([])
  })

  // El placeholder vacío del <select> es exactamente lo que esto rechaza: sin él el navegador
  // pinta la primera opción mientras el estado sigue en '' (rules/ui.md).
  it('la empresa es obligatoria y el placeholder vacío no cuenta', () => {
    expect(validarReunion({ ...OK, empresa: '' })).toContain('reuniones.error.empresa')
  })

  it('el título no puede ser sólo espacios', () => {
    expect(validarReunion({ ...OK, titulo: '   ' })).toContain('reuniones.error.titulo')
  })

  it('la fecha es obligatoria', () => {
    expect(validarReunion({ ...OK, fecha: '' })).toContain('reuniones.error.fecha')
  })

  // `modalidad` es obligatoria aunque la columna tenga DEFAULT: lo que se guarda tiene que
  // ser algo que alguien eligió.
  it('la modalidad no puede quedar en el placeholder', () => {
    expect(validarReunion({ ...OK, modalidad: '' })).toContain('reuniones.error.modalidad')
  })

  it('un formulario vacío devuelve los CUATRO errores, no sólo el primero', () => {
    expect(validarReunion({ ...OK, empresa: '', titulo: '', fecha: '', modalidad: '' }))
      .toEqual(['reuniones.error.empresa', 'reuniones.error.titulo', 'reuniones.error.fecha',
                'reuniones.error.modalidad'])
  })
})
