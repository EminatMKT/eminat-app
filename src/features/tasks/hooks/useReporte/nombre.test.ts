import { describe, it, expect } from 'vitest'
import { nombreDelReporte } from './nombre'

const yo = { id: 'u1', nombre: 'Freddy Admin' }
// Los dos catálogos a propósito distintos, que es lo que pasa en producción: `asignables` sale
// de `listActivos()` y el mapa de `listAll()`, que además exige `nombre` y está sujeto a RLS.
const asignables = [{ id: 'u1', nombre: 'Freddy Admin' }, { id: 'u2', nombre: 'Ana Sinequipo' }]
const catalogo = { u1: 'Freddy Admin', u3: 'Caro Inactiva' }

describe('nombreDelReporte', () => {
  it('usa el nombre de la MISMA lista que llena el desplegable', () => {
    expect(nombreDelReporte('u2', asignables, catalogo, yo)).toBe('Ana Sinequipo')
  })

  // El único que tiene a los inactivos es el catálogo: alguien que ya no es asignable sigue
  // teniendo reportes viejos que hay que poder mirar.
  it('cae al catálogo para alguien que ya no es asignable', () => {
    expect(nombreDelReporte('u3', asignables, catalogo, yo)).toBe('Caro Inactiva')
  })

  // El bug: el reporte es de otra persona, ningún catálogo la tiene, y la hoja salía con el
  // nombre de quien miraba encima de las horas de esa otra persona.
  it('NO pone tu nombre en el reporte de otro cuando no está en ningún catálogo', () => {
    expect(nombreDelReporte('u9', asignables, catalogo, yo)).toBe('—')
    expect(nombreDelReporte('u9', [], {}, yo)).toBe('—')
  })

  it('sí cae a tu nombre cuando el reporte es EL TUYO y no estás en ningún catálogo', () => {
    expect(nombreDelReporte('u1', [], {}, yo)).toBe('Freddy Admin')
  })

  it('sin id no hay a quién nombrar: no cuenta como "sos vos"', () => {
    expect(nombreDelReporte('', [], {}, { id: undefined, nombre: 'Freddy Admin' })).toBe('—')
    expect(nombreDelReporte('', [], {}, null)).toBe('—')
  })

  it('un usuario sin nombre cargado da el guion, no una cadena vacía', () => {
    expect(nombreDelReporte('u1', [], {}, { id: 'u1', nombre: null })).toBe('—')
  })
})
