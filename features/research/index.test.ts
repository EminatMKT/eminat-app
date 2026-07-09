import { describe, it, expect } from 'vitest'
import * as research from './index'
import { EXPORT_HEADERS, leadColumnFor } from './constants'

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
