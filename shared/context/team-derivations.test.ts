import { describe, it, expect } from 'vitest'
import { deriveMiembrosRef, deriveMiembrosAsignables, deriveEquipoMarketing } from './team-derivations'

const mkt = { departamentos: { codigo: 'MKT' } }
const otro = { departamentos: { codigo: 'FIN' } }
const usuarios = [
  { nombre: 'Freddy', responsable_ref: 'Coord_MFreddy', activo: true, equipos: mkt },
  { nombre: 'Angie', responsable_ref: null, activo: true, equipos: mkt },     // sin ref
  { nombre: 'Jonathan', responsable_ref: 'Jonathan_CRM', activo: false, equipos: null }, // inactivo, sin equipo
  { nombre: 'Ana', responsable_ref: 'FIN_Ana', activo: true, equipos: otro }, // otro depto
]

describe('team-derivations', () => {
  it('miembrosRef incluye a los inactivos con ref (para tareas históricas)', () => {
    expect(deriveMiembrosRef(usuarios)).toEqual({
      Coord_MFreddy: 'Freddy', Jonathan_CRM: 'Jonathan', FIN_Ana: 'Ana',
    })
  })
  it('asignables = activos + MKT + con ref', () => {
    expect(deriveMiembrosAsignables(usuarios)).toEqual([{ ref: 'Coord_MFreddy', nombre: 'Freddy' }])
  })
  it('equipoMarketing = activos + MKT (incluye a los sin ref, excluye inactivos y otros deptos)', () => {
    expect(deriveEquipoMarketing(usuarios).map((u) => u.nombre)).toEqual(['Freddy', 'Angie'])
  })
})
