import { describe, it, expect } from 'vitest'
import { deriveMiembrosPorId, deriveMiembrosAsignables, deriveEquipoMarketing } from './index'
import { usuarios, map } from './fixtures'

describe('team-derivations', () => {
  it('miembrosPorId incluye a los inactivos (para tareas históricas)', () => {
    expect(deriveMiembrosPorId(usuarios)).toEqual({
      u1: 'Freddy Crespín', u2: 'Angie Núñez', u3: 'Jonathan Bula',
      u4: 'Ana Pérez', u5: 'Sinapellido',
    })
  })
  it('miembrosPorId ignora las filas sin id o sin nombre', () => {
    expect(deriveMiembrosPorId([
      { id: 'x', nombre: null, activo: true },
      { id: null, nombre: 'Fantasma', activo: true },
    ])).toEqual({})
  })
  it('asignables = activos con el módulo tasks (el admin entra por short-circuit)', () => {
    expect(deriveMiembrosAsignables(usuarios, map)).toEqual([
      { id: 'u1', nombre: 'Freddy Crespín' },
      { id: 'u2', nombre: 'Angie Núñez' },
      { id: 'u5', nombre: 'Sinapellido' },
    ])
  })
  // La regresión que se está arreglando: u5 no tiene `equipo_id` —el estado por
  // defecto de un alta del panel— y el filtro por departamento lo dejaba afuera.
  it('asignables incluye a quien no tiene equipo asignado', () => {
    expect(deriveMiembrosAsignables(usuarios, map).map(m => m.id)).toContain('u5')
  })
  it('asignables excluye a quien no tiene el módulo', () => {
    expect(deriveMiembrosAsignables(usuarios, map).map(m => m.id)).not.toContain('u4')
  })
  it('equipoMarketing = activos + MKT (excluye inactivos y otros deptos)', () => {
    expect(deriveEquipoMarketing(usuarios).map((u) => u.nombre)).toEqual(['Freddy', 'Angie'])
  })
})
