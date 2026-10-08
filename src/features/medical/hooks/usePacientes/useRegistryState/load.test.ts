import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listPacientes, listPacienteFuentes, listPacienteContactos } from '@/features/medical/data/pacientes'
import load from './load'

vi.mock('@/features/medical/data/pacientes', () => ({
  listPacientes: vi.fn(),
  listPacienteFuentes: vi.fn(),
  listPacienteContactos: vi.fn(),
}))

beforeEach(() => {
  for (const fn of [listPacientes, listPacienteFuentes, listPacienteContactos]) {
    vi.mocked(fn).mockReset().mockResolvedValue([])
  }
})

describe('load.recargar', () => {
  it('sets loading true immediately, then writes the loaded registry', async () => {
    const setState = vi.fn()
    await load.recargar(setState)
    const firstUpdater = setState.mock.calls[0][0]
    const before = { loading: false }
    expect(firstUpdater(before).loading).toBe(true)
    const landed = setState.mock.calls[1][0]
    const expected = {
      pacientes: [],
      pacienteFuentes: [],
      pacienteContactos: [],
      loading: false,
      loaded: true,
    }
    expect(landed).toEqual(expected)
  })

  it('clears loading instead of throwing when a fetch fails', async () => {
    vi.mocked(listPacientes).mockRejectedValueOnce(new Error('network down'))
    const setState = vi.fn()
    await expect(load.recargar(setState)).resolves.not.toThrow()
    const calls = setState.mock.calls
    const lastUpdater = calls[calls.length - 1][0]
    const before = { loading: true }
    expect(lastUpdater(before).loading).toBe(false)
  })
})

describe('load.ensureLoaded', () => {
  it('skips the fetch when already loaded', async () => {
    const setState = vi.fn()
    await load.ensureLoaded(true, setState)
    expect(setState).not.toHaveBeenCalled()
  })

  it('fetches when not loaded yet', async () => {
    const setState = vi.fn()
    await load.ensureLoaded(false, setState)
    expect(vi.mocked(listPacientes)).toHaveBeenCalledTimes(1)
  })
})
