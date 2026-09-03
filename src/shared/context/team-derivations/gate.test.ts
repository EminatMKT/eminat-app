import { describe, it, expect } from 'vitest'
import { deriveMiembrosAsignables } from './index'
import { usuarios, map, otro } from './fixtures'

describe('el gate de asignables es el módulo de tareas', () => {
  const conEnfermera = [...usuarios, { id: 'u6', nombre: 'Rosa', apellido: 'Vera', activo: true, rol: 'enfermera', equipos: otro }]

  // Lo que la mudanza viene a habilitar: alguien de otro departamento entra al tablero.
  it('incluye a quien tiene tasks aunque no sea de marketing', () => {
    expect(deriveMiembrosAsignables(conEnfermera, map).map(m => m.id)).toContain('u6')
  })

  // El gate NO es stratix-mkt: si lo fuera, /tasks no serviría para lo que se creó.
  it('excluye a quien no tiene tasks aunque esté activo', () => {
    expect(deriveMiembrosAsignables(conEnfermera, map).map(m => m.id)).not.toContain('u4')
  })

  // La consecuencia que hay que poder señalar: esta misma lista alimenta el <select> del
  // reporte de pago (via useTablero.idsTeam → useReporte). Dar el módulo es volver liquidable.
  it('la lista de asignables ES la lista de liquidables', () => {
    const ids = deriveMiembrosAsignables(conEnfermera, map).map(m => m.id)
    expect(ids).toEqual(['u1', 'u2', 'u5', 'u6'])
  })
})
