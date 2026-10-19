import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { createMembershipPdf } from './membership-pdf'

describe('native Corazón Salud membership PDF', () => {
  it('generates a readable single-page card from synthetic canonical fields', async () => {
    const pdf = await createMembershipPdf({
      code: 'QA-000001', firstName: 'Prueba', lastName: 'Miembro',
      plan: 'ESSENTIAL', membershipType: 'FAMILY', duration: 'MONTHLY',
      issuedAt: '2026-10-18', expiresAt: '2026-12-18', status: 'ACTIVE',
    })
    expect(pdf.byteLength).toBeGreaterThan(1000)
    expect(Buffer.from(pdf).toString('ascii', 0, 8)).toBe('%PDF-1.7')
    const parsed = await PDFDocument.load(pdf)
    expect(parsed.getPageCount()).toBe(1)
    expect(parsed.getPage(0).getSize()).toEqual({ width: 512, height: 768 })
  })
  it('renders historical memberships with absent plan, type and duration honestly', async () => {
    const pdf=await createMembershipPdf({
      code:'QA-LEGACY',firstName:'Prueba',lastName:'Histórica',
      plan:'LEGACY_UNSPECIFIED',membershipType:'LEGACY_UNSPECIFIED',
      duration:'LEGACY_UNSPECIFIED',issuedAt:'2026-01-01',expiresAt:'2026-03-01',status:'ACTIVE',
    })
    expect(pdf.byteLength).toBeGreaterThan(1000)
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1)
  })
})
