import { describe, it, expect } from 'vitest'
import type { Reunion } from '@/features/reuniones/types'
import { filtrarReuniones } from './index'

const base: Reunion = {
  id: '1', codigo: 'MTG-EMC-20260829-001', empresa: 'EMC', titulo: 'Comité de presupuesto',
  tipo: 'comite', lugar: null, modalidad: 'presencial', fecha: '2026-08-29',
  hora_inicio: null, hora_fin: null, objetivo: null, conclusiones: null,
  proxima_fecha: null, proxima_notas: null, estado: 'borrador', created_by: null,
}
const sinCodigo: Reunion = { ...base, id: '2', codigo: null, titulo: 'Seguimiento semanal' }
const TODAS = [base, sinCodigo]

describe('filtrarReuniones', () => {
  it('sin búsqueda devuelve todo', () => {
    expect(filtrarReuniones(TODAS, '')).toEqual(TODAS)
    expect(filtrarReuniones(TODAS, '   ')).toEqual(TODAS)
  })

  it('encuentra por título, sin importar mayúsculas', () => {
    expect(filtrarReuniones(TODAS, 'PRESUPUESTO')).toEqual([base])
  })

  it('encuentra por código, que es como se nombra una reunión en un correo', () => {
    expect(filtrarReuniones(TODAS, '20260829-001')).toEqual([base])
  })

  // El bug que el `?? ''` evita: sin él, `${undefined}` mete "undefined" en el texto buscado
  // y una reunión SIN código aparecería al teclear "undef".
  it('una reunión sin código no aparece al buscar "undef"', () => {
    expect(filtrarReuniones(TODAS, 'undef')).toEqual([])
  })

  it('sin coincidencias devuelve lista vacía, no todo', () => {
    expect(filtrarReuniones(TODAS, 'zzz')).toEqual([])
  })
})
