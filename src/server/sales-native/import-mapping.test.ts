import { describe, expect, it } from 'vitest'
import { autoMapImportColumns, mapImportRow } from './import-mapping'

describe('native Sales import mapping', () => {
  it('maps ANNIE-style bilingual headers without trusting tenant or owner columns', () => {
    const headers = ['Nombre', 'Correo', 'Teléfono', 'Fuente', 'Empresa', 'Organization ID', 'Owner ID']
    const mapping = autoMapImportColumns(headers, 'leads')
    expect(mapping.map(item => item.field)).toEqual(['displayName', 'email', 'phone', 'source', 'companyName'])
    expect(mapImportRow(['QA Lead', 'QA@EXAMPLE.INVALID', '555-0100', 'Referido', 'QA Co',
      'other-tenant', 'other-owner'], mapping, 'leads')).toEqual({
      displayName: 'QA Lead', email: 'qa@example.invalid', phone: '555-0100',
      source: 'Referido', companyName: 'QA Co',
    })
  })

  it('builds Contact names and rejects invalid values before any write', () => {
    const mapping = autoMapImportColumns(['First Name', 'Apellido', 'Fecha nacimiento', 'Correo'], 'contacts')
    expect(mapImportRow(['QA', 'Patient', '10/18/1990', 'qa@example.invalid'], mapping, 'contacts'))
      .toMatchObject({ displayName: 'QA Patient', dateOfBirth: '1990-10-18' })
    expect(() => mapImportRow(['QA', 'Patient', '02/30/1990', 'qa@example.invalid'], mapping, 'contacts'))
      .toThrow('INVALID_DATE')
    expect(() => mapImportRow(['QA', 'Patient', '10/18/1990', '__ANNIE_FORMULA_CELL__'], mapping, 'contacts'))
      .toThrow('FORMULA_CELL')
  })

  it('rejects duplicate or unsupported mappings', () => {
    expect(autoMapImportColumns(['Nombre', 'Full Name', 'Correo'], 'contacts'))
      .toEqual([{ column: 0, field: 'displayName' }, { column: 2, field: 'email' }])
    expect(() => mapImportRow(['QA'], [{ column: 0, field: 'displayName' },
      { column: 0, field: 'email' }], 'contacts')).toThrow('INVALID_MAPPING')
    expect(() => mapImportRow(['QA'], [{ column: 0, field: 'organizationId' }], 'leads'))
      .toThrow('INVALID_MAPPING')
  })
})
