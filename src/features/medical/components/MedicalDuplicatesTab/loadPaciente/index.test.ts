import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import pacienteFixture from '@/features/medical/hooks/usePacientes/fixture'
import loadPaciente from '.'

const mocks = vi.hoisted(() => ({ getPaciente: vi.fn() }))
vi.mock('@/features/medical/data/pacientes', () => ({ getPaciente: mocks.getPaciente }))

describe('loadPaciente', () => {
  beforeEach(() => {
    mocks.getPaciente.mockReset()
  })

  it('resolves with the loaded patient', async () => {
    const patient = pacienteFixture()
    mocks.getPaciente.mockResolvedValue({ data: patient, error: null })
    await expect(loadPaciente(patient.id)).resolves.toBe(patient)
  })

  // The bug this guards against: Supabase resolves `{ error }` instead of throwing, so a missing
  // or unreadable patient came back as `null` typed as `Paciente` and the pair silently never opened.
  it('rejects when the read resolves with an error, so the open pair can report it', async () => {
    const failure = { code: 'PGRST116', message: 'not found' }
    mocks.getPaciente.mockResolvedValue({ data: null, error: failure })
    await expect(loadPaciente('gone')).rejects.toBe(failure)
  })
})
