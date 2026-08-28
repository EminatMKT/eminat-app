import { describe, it, expect } from 'vitest'
import { deriveMiembrosPorId, deriveMiembrosAsignables, deriveEquipoMarketing } from './team-derivations'
import { MODULE } from '@/shared/auth/permissions'

const mkt = { departamentos: { codigo: 'MKT' } }
const otro = { departamentos: { codigo: 'FIN' } }
const usuarios = [
  { id: 'u1', nombre: 'Freddy', apellido: 'Crespín', activo: true, rol: 'admin', equipos: mkt },
  { id: 'u2', nombre: 'Angie', apellido: 'Núñez', activo: true, rol: 'disenador', equipos: mkt },
  { id: 'u3', nombre: 'Jonathan', apellido: 'Bula', activo: false, rol: 'disenador', equipos: null }, // inactivo
  { id: 'u4', nombre: 'Ana', apellido: 'Pérez', activo: true, rol: 'medico', equipos: otro },         // sin el módulo
  { id: 'u5', nombre: 'Sinapellido', apellido: null, activo: true, rol: 'disenador', equipos: null }, // SIN equipo
]

// Rol -> módulos, como lo carga AppContext desde la DB.
const map = { disenador: [MODULE.STRATIX_MKT], medico: [MODULE.MEDICAL] }

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
  it('asignables = activos con el módulo stratix-mkt (el admin entra por short-circuit)', () => {
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
