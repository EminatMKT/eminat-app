import { describe, expect, it } from 'vitest'
import { prepareImportPreview } from './import-preview'

describe('native Sales import preview', () => {
  it('reports ready, duplicate, and invalid rows without owner or tenant fields', () => {
    const preview = prepareImportPreview({ name: 'CSV', headers: ['Nombre', 'Correo', 'Fuente', 'Owner ID'],
      rows: [
        { rowNumber: 2, values: ['QA One', 'qa@example.invalid', 'Web', 'other-owner'] },
        { rowNumber: 3, values: ['QA Two', 'QA@EXAMPLE.INVALID', 'Web', 'other-owner'] },
        { rowNumber: 4, values: ['', 'broken', 'Web', 'other-owner'] },
      ] }, 'leads')
    expect(preview.counts).toEqual({ ready: 1, duplicate: 1, invalid: 1 })
    expect(preview.mapping.map(item => item.field)).toEqual(['displayName', 'email', 'source'])
    expect(preview.mapped[0].data).not.toHaveProperty('ownerMemberId')
    expect(preview.rows[2].code).toBe('VALIDATION_ERROR')
  })
})
