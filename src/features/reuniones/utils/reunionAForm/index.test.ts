import { describe, it, expect } from 'vitest'
import type { Reunion } from '@/features/reuniones/types'
import { reunionAForm } from './index'

const llena: Reunion = {
  id: '1', codigo: 'MTG-EMC-20260829-001', empresa: 'EMC', titulo: 'Comité de presupuesto',
  tipo: 'comite', lugar: 'Sala 2', modalidad: 'presencial', fecha: '2026-08-29',
  hora_inicio: '14:30:00', hora_fin: '15:45:00', objetivo: 'Cerrar el presupuesto',
  conclusiones: null, proxima_fecha: null, proxima_notas: null,
  estado: 'borrador', created_by: null,
}
const vacia: Reunion = {
  ...llena, tipo: null, lugar: null, objetivo: null, hora_inicio: null, hora_fin: null,
}

describe('reunionAForm', () => {
  it('trae los campos que el formulario edita', () => {
    expect(reunionAForm(llena)).toEqual({
      empresa: 'EMC', titulo: 'Comité de presupuesto', fecha: '2026-08-29',
      modalidad: 'presencial', tipo: 'comite', lugar: 'Sala 2',
      objetivo: 'Cerrar el presupuesto', hora_inicio: '14:30', hora_fin: '15:45',
    })
  })

  // Con NULL el <input> deja de ser controlado y React avisa en cada tecla.
  it('convierte NULL en cadena vacía, que es lo que un <input> necesita', () => {
    const form = reunionAForm(vacia)
    expect(form).toMatchObject({ tipo: '', lugar: '', objetivo: '', hora_inicio: '', hora_fin: '' })
  })

  // Sin recortar, abrir una reunión y guardarla sin tocar nada cambiaría las horas.
  it('recorta los segundos que devuelve Postgres', () => {
    expect(reunionAForm(llena).hora_inicio).toBe('14:30')
  })
})
