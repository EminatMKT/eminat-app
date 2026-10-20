import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import pacienteFixture from '@/features/medical/hooks/usePacientes/fixture'
import CONTACT_TYPE from '@/features/medical/constants/contactType'
import loadPaciente from '.'

const mocks = vi.hoisted(() => ({ getPaciente: vi.fn(), patientContacts: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: {} }))
vi.mock('@/features/medical/data/pacientes', () => ({ getPaciente: mocks.getPaciente }))
vi.mock('@/features/medical/data/patientContacts', () => ({ default: mocks.patientContacts }))
vi.mock('@/features/medical/data/patientNames', () => ({ default: vi.fn() }))

const ROWS = [
  { id: 'c1', tipo: CONTACT_TYPE.phone, valor: '555-0001' },
  { id: 'c2', tipo: CONTACT_TYPE.phone, valor: '555-0001' },
  { id: 'c3', tipo: CONTACT_TYPE.email, valor: 'ana@example.invalid' },
]

describe('loadPaciente', () => {
  beforeEach(() => {
    mocks.getPaciente.mockReset()
    mocks.patientContacts.mockReset().mockResolvedValue({ data: ROWS, error: null })
  })

  it('loads the patient with every phone and email row it holds', async () => {
    const patient = pacienteFixture()
    mocks.getPaciente.mockResolvedValue({ data: patient, error: null })
    const review = await loadPaciente(patient.id)
    expect(review.paciente).toBe(patient)
    expect(review.email).toEqual([{ id: 'c3', valor: 'ana@example.invalid' }])
  })

  // One phone saved under two `fuente`s is two rows: both ids must reach the screen, or
  // unchecking it would drop one row and keep the other.
  it('keeps one entry per row, even for a repeated value', async () => {
    mocks.getPaciente.mockResolvedValue({ data: pacienteFixture(), error: null })
    const review = await loadPaciente('p1')
    expect(review.telefono.map(({ id }) => id)).toEqual(['c1', 'c2'])
  })

  // The bug this guards against: Supabase resolves `{ error }` instead of throwing, so a missing
  // or unreadable patient came back as `null` typed as `Paciente` and the pair silently never opened.
  it('rejects when the patient read resolves with an error', async () => {
    const failure = { code: 'PGRST116', message: 'not found' }
    mocks.getPaciente.mockResolvedValue({ data: null, error: failure })
    await expect(loadPaciente('gone')).rejects.toBe(failure)
  })

  it('rejects when the contacts read fails, instead of showing no phones', async () => {
    const failure = { code: '42501', message: 'denied' }
    mocks.getPaciente.mockResolvedValue({ data: pacienteFixture(), error: null })
    mocks.patientContacts.mockResolvedValue({ data: null, error: failure })
    await expect(loadPaciente('p1')).rejects.toBe(failure)
  })
})
