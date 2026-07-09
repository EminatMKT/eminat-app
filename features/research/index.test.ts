import { describe, it, expect } from 'vitest'
import * as research from './index'
import { EXPORT_HEADERS, leadColumnFor, validateLead, buildLeadPayload } from './fields'

describe('features/research API pública', () => {
  it('expone ResearchModule', () => {
    expect(research.ResearchModule).toBeDefined()
  })
  it('declara su access (convención access-aware)', () => {
    expect(research.access).toEqual({ module: 'research' })
  })
})

describe('mapeo de columnas CSV (round-trip export<->import)', () => {
  it('traduce headers amigables a columnas reales de research_leads', () => {
    expect(leadColumnFor('email')).toBe('contact_email')
    expect(leadColumnFor('nct')).toBe('nct_number')
    expect(leadColumnFor('status')).toBe('recruitment_status')
    expect(leadColumnFor('next_followup')).toBe('next_followup_date')
  })
  it('acepta también la columna real y descarta desconocidas', () => {
    expect(leadColumnFor('contact_email')).toBe('contact_email')
    expect(leadColumnFor('columna_inexistente')).toBeNull()
  })
  it('todo header exportado round-trippea (el export no genera columnas fantasma)', () => {
    for (const h of EXPORT_HEADERS) expect(leadColumnFor(h)).toBeTruthy()
  })
})

describe('validateLead', () => {
  const base = { official_title: 'Estudio X', stage: 'Identificado', nct_number: 'NCT01' }
  it('acepta un lead válido', () => {
    expect(validateLead(base)).toBeNull()
  })
  it('exige official_title y stage', () => {
    expect(validateLead({ ...base, official_title: '' })).toMatch(/Official Title/)
    expect(validateLead({ ...base, stage: '' })).toMatch(/Stage/)
  })
  it('exige NCT# o un contacto', () => {
    expect(validateLead({ official_title: 'X', stage: 'Identificado' })).toMatch(/NCT/)
    expect(validateLead({ official_title: 'X', stage: 'Identificado', contact_name: 'Dr. A' })).toBeNull()
  })
  it('valida formato de email y URL', () => {
    expect(validateLead({ ...base, contact_email: 'no-es-mail' })).toMatch(/email/i)
    expect(validateLead({ ...base, record_link: 'ftp://x' })).toMatch(/Record Link/)
    expect(validateLead({ ...base, contact_email: 'a@b.com', record_link: 'https://x.com' })).toBeNull()
  })
})

describe('buildLeadPayload', () => {
  it('solo emite columnas conocidas, con null en vacíos y boolean en checkbox', () => {
    const p = buildLeadPayload({ official_title: 'X', nct_number: '', spain_focus: 'true', campo_basura: 'z' })
    expect(p.official_title).toBe('X')
    expect(p.nct_number).toBeNull()
    expect(p.spain_focus).toBe(true)
    expect('campo_basura' in p).toBe(false)
  })
})
