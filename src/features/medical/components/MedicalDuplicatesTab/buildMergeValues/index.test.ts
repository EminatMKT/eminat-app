import { describe, expect, it } from 'vitest'
import pacienteFixture from '@/features/medical/hooks/usePacientes/fixture'
import type { Paciente } from '@/features/medical/types'
import buildMergeValues from '.'

const IDENTITY = ['id', 'mrn', 'created_at', 'updated_at']
const NO_CLICKS: Record<string, string> = {}
const PICK_LOSER_INSURANCE: Record<string, string> = { seguro: 'Cigna' }

const winnerFields: Partial<Paciente> = {
  id: 'a',
  mrn: 'MRN-A',
  telefono: '555-0001',
  seguro: 'Aetna',
  email: null,
}
const loserFields: Partial<Paciente> = {
  id: 'b',
  mrn: 'MRN-B',
  telefono: '555-0002',
  seguro: 'Cigna',
  notas: 'Prefers mornings',
  email: '',
}
const winner = pacienteFixture(winnerFields)
const loser = pacienteFixture(loserFields)

// The bug this guards against: only clicked fields were sent, so the RPC rejected every pair
// with a differing column outside the comparison grid (a phone, an email, an empty side).
describe('buildMergeValues', () => {
  it('resolves every column the two rows differ on, not only the clicked ones', () => {
    const values = buildMergeValues(winner, loser, NO_CLICKS)
    const winnerRow: Record<string, unknown> = { ...winner }
    const loserRow: Record<string, unknown> = { ...loser }
    const differing = Object.keys(winnerRow)
      .filter(column => !IDENTITY.includes(column) && winnerRow[column] !== loserRow[column])
    expect(differing).toEqual(expect.arrayContaining(['telefono', 'seguro', 'notas', 'email']))
    for (const column of differing) expect(values).toHaveProperty(column)
  })

  it('keeps the winner on a phone conflict and fills a side that is empty', () => {
    const values = buildMergeValues(winner, loser, NO_CLICKS)
    expect(values.telefono).toBe('555-0001')
    expect(values.notas).toBe('Prefers mornings')
    expect(values.email).toBeNull()
  })

  it('lets a reviewer click override the default pick', () => {
    expect(buildMergeValues(winner, loser, NO_CLICKS).seguro).toBe('Aetna')
    expect(buildMergeValues(winner, loser, PICK_LOSER_INSURANCE).seguro).toBe('Cigna')
  })

  it('never sends identity or audit columns, which the RPC rejects', () => {
    const values = buildMergeValues(winner, loser, NO_CLICKS)
    for (const column of IDENTITY) expect(values).not.toHaveProperty(column)
  })
})
