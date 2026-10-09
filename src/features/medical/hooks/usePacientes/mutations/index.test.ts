import { describe, it, expect, vi, beforeEach } from 'vitest'
import { insertPaciente, updatePaciente, upsertPacienteContactos } from '@/features/medical/data/pacientes'
import pacienteFixture from '../fixture'
import mutations from './index'

vi.mock('@/features/medical/data/pacientes', () => ({
  insertPaciente: vi.fn(),
  updatePaciente: vi.fn(),
  upsertPacienteContactos: vi.fn(),
}))

const contactRow = (tipo: 'telefono' | 'email', valor: string) => ({
  paciente_id: 'p1',
  tipo,
  valor,
  fuente: 'manual',
  clave_origen: null,
})

describe('mutations.add', () => {
  beforeEach(() => {
    vi.mocked(insertPaciente).mockReset()
    vi.mocked(upsertPacienteContactos).mockReset().mockResolvedValue(undefined)
  })

  it('writes the new phone/email to paciente_contactos too', async () => {
    const resolved = { data: pacienteFixture({ id: 'p1' }), error: null } as Awaited<ReturnType<typeof insertPaciente>>
    vi.mocked(insertPaciente).mockResolvedValue(resolved)
    await mutations.add({ telefono: '(305) 555-1111', email: 'a@b.com' })
    const expected = [contactRow('telefono', '(305) 555-1111'), contactRow('email', 'a@b.com')]
    expect(vi.mocked(upsertPacienteContactos)).toHaveBeenCalledWith(expected)
  })

  it('returns the error instead of writing contacts when the insert fails', async () => {
    const failed = { data: null, error: { message: 'boom' } } as Awaited<ReturnType<typeof insertPaciente>>
    vi.mocked(insertPaciente).mockResolvedValue(failed)
    const result = await mutations.add({ telefono: '(305) 555-1111' })
    expect(result).toEqual({ error: { message: 'boom' } })
    expect(vi.mocked(upsertPacienteContactos)).not.toHaveBeenCalled()
  })
})

describe('mutations.edit', () => {
  beforeEach(() => {
    vi.mocked(updatePaciente).mockReset()
    vi.mocked(upsertPacienteContactos).mockReset().mockResolvedValue(undefined)
  })

  it('keeps the previous phone as a contact instead of dropping it', async () => {
    const resolved = { data: pacienteFixture({ id: 'p1' }), error: null } as Awaited<ReturnType<typeof updatePaciente>>
    vi.mocked(updatePaciente).mockResolvedValue(resolved)
    const previo = pacienteFixture({ id: 'p1', telefono: '(305) 555-1111' })
    await mutations.edit('p1', { telefono: '(305) 555-2222' }, previo)
    const expected = [contactRow('telefono', '(305) 555-1111'), contactRow('telefono', '(305) 555-2222')]
    expect(vi.mocked(upsertPacienteContactos)).toHaveBeenCalledWith(expected)
  })
})
