import { describe, it, expect } from 'vitest'
import { departamentoPorActividad, departamentoPorUsuario } from './index'
import type { Usuario, OrgRow } from '@/shared/context/loadAppData'

const equipos = [
  { id: 'e1', codigo: 'DIS', nombre: 'Diseño', departamento_id: 'd-mkt' },
  { id: 'e2', codigo: 'ENF', nombre: 'Enfermería', departamento_id: 'd-med' },
  { id: 'e3', codigo: 'HUE', nombre: 'Huérfano', departamento_id: null },
] as OrgRow[]

const usuarios = [
  { id: 'u1', equipo_id: 'e1' },
  { id: 'u2', equipo_id: 'e2' },
  { id: 'u3', equipo_id: null },     // sin equipo: la fase 0 los deja en cero, pero pasa
  { id: 'u4', equipo_id: 'e3' },     // equipo sin departamento
  { id: 'u5', equipo_id: 'e9' },     // equipo que ya no existe
] as Usuario[]

describe('departamentoPorUsuario', () => {
  it('navega equipo → departamento', () => {
    const m = departamentoPorUsuario(usuarios, equipos)
    expect(m.u1).toBe('d-mkt')
    expect(m.u2).toBe('d-med')
  })

  // El filtro de área se estrena con gente todavía sin equipo asignado: si esto reventara, el
  // tablero entero se caería por un dato de catálogo incompleto.
  it('omite a quien no tiene departamento derivable, sin reventar', () => {
    const m = departamentoPorUsuario(usuarios, equipos)
    expect(m.u3).toBeUndefined()
    expect(m.u4).toBeUndefined()
    expect(m.u5).toBeUndefined()
  })

  it('con catálogos vacíos devuelve un mapa vacío', () => {
    expect(departamentoPorUsuario([], [])).toEqual({})
  })
})

describe('departamentoPorActividad', () => {
  const porResponsable = { u1: 'd-mkt', u2: 'd-med', u3: 'd-mkt' }

  it('incluye los departamentos de todos los responsables de una tarea compartida', () => {
    const deps = departamentoPorActividad({
      responsables: [
        { usuario_id: 'u1', es_lider: true },
        { usuario_id: 'u2', es_lider: false },
      ],
    }, porResponsable)

    expect(deps).toEqual(['d-mkt', 'd-med'])
  })

  it('deduplica departamentos y omite responsables sin departamento derivable', () => {
    const deps = departamentoPorActividad({
      responsables: [
        { usuario_id: 'u1', es_lider: true },
        { usuario_id: 'u3', es_lider: false },
        { usuario_id: 'u9', es_lider: false },
      ],
    }, porResponsable)

    expect(deps).toEqual(['d-mkt'])
  })
})
