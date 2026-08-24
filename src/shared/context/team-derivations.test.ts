import { describe, it, expect } from 'vitest'
import { deriveMiembrosPorId, deriveMiembrosAsignables, deriveEquipoMarketing } from './team-derivations'

const mkt = { departamentos: { codigo: 'MKT' } }
const otro = { departamentos: { codigo: 'FIN' } }
const usuarios = [
  { id: 'u1', nombre: 'Freddy', apellido: 'Crespín', activo: true, equipos: mkt },
  { id: 'u2', nombre: 'Angie', apellido: 'Núñez', activo: true, equipos: mkt },
  { id: 'u3', nombre: 'Jonathan', apellido: 'Bula', activo: false, equipos: null }, // inactivo, sin equipo
  { id: 'u4', nombre: 'Ana', apellido: 'Pérez', activo: true, equipos: otro },      // otro depto
  { id: 'u5', nombre: 'Sinapellido', apellido: null, activo: true, equipos: mkt },
]

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
  it('asignables = activos + MKT, ya sin exigir ref', () => {
    expect(deriveMiembrosAsignables(usuarios)).toEqual([
      { id: 'u1', nombre: 'Freddy Crespín' },
      { id: 'u2', nombre: 'Angie Núñez' },
      { id: 'u5', nombre: 'Sinapellido' },
    ])
  })
  it('equipoMarketing = activos + MKT (excluye inactivos y otros deptos)', () => {
    expect(deriveEquipoMarketing(usuarios).map((u) => u.nombre)).toEqual(['Freddy', 'Angie', 'Sinapellido'])
  })
})
