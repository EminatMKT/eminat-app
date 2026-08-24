import { describe, it, expect } from 'vitest'
import { codigoFrom, pickFields, cargoIdsOf, cargoNamesOf } from './org-catalogs'

describe('codigoFrom', () => {
  it('normaliza a un código estable en mayúsculas', () => {
    expect(codigoFrom('Marketing')).toBe('MARKETING')
    expect(codigoFrom('Diseño & Video')).toBe('DISENO_VIDEO')
    expect(codigoFrom('  Lead Editor  ')).toBe('LEAD_EDITOR')
  })
  it('nunca devuelve vacío (codigo es NOT NULL)', () => {
    expect(codigoFrom('***')).toBe('ITEM')
    expect(codigoFrom('')).toBe('ITEM')
  })
})

describe('pickFields', () => {
  it('solo toma las columnas del catálogo y descarta lo demás', () => {
    const row = pickFields('cargos', { nombre: 'Animations', color: '#fff', id: 'x' })
    expect(row).toEqual({ nombre: 'Animations' })
  })
  it('convierte el select vacío en NULL (sin asignar)', () => {
    const row = pickFields('equipos', { nombre: 'MKT', departamento_id: 'd1', lider_id: '' })
    expect(row).toEqual({ nombre: 'MKT', departamento_id: 'd1', lider_id: null })
  })
})

describe('lectores del embed usuario_cargos', () => {
  const u = { usuario_cargos: [
    { cargo_id: 'c1', cargos: { codigo: 'CM', nombre: 'CM' } },
    { cargos: { codigo: 'ANIM', nombre: 'Animations' } }, // embed sin cargo_id
  ] }
  it('cargoIdsOf saltea las filas sin id', () => expect(cargoIdsOf(u)).toEqual(['c1']))
  it('cargoNamesOf lista los nombres embebidos', () => expect(cargoNamesOf(u)).toEqual(['CM', 'Animations']))
})
