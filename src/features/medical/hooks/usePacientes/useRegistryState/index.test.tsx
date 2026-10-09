import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { listPacientes, listPacienteFuentes, listPacienteContactos } from '@/features/medical/data/pacientes'
import useRegistryState from './index'

vi.mock('@/features/medical/data/pacientes', () => ({
  listPacientes: vi.fn(),
  listPacienteFuentes: vi.fn(),
  listPacienteContactos: vi.fn(),
}))

let seen: ReturnType<typeof useRegistryState> | null = null
function Probe() {
  seen = useRegistryState()
  return null
}

describe('useRegistryState', () => {
  beforeEach(() => {
    seen = null
    for (const fn of [listPacientes, listPacienteFuentes, listPacienteContactos]) {
      vi.mocked(fn).mockReset().mockResolvedValue([])
    }
    renderToStaticMarkup(<Probe />)
  })

  it('starts out not loading and not loaded, with nothing fetched', () => {
    expect(seen?.loading).toBe(false)
    expect(seen?.loaded).toBe(false)
    expect(seen?.pacientes).toEqual([])
  })

  it('reaches the network on no render of its own', () => {
    expect(vi.mocked(listPacientes)).not.toHaveBeenCalled()
  })

  it('loads the full registry when ensureLoaded runs', async () => {
    await seen?.ensureLoaded()
    expect(vi.mocked(listPacientes)).toHaveBeenCalledTimes(1)
  })

  it('does not throw past the hook when a load fails', async () => {
    vi.mocked(listPacientes).mockRejectedValueOnce(new Error('network down'))
    await expect(seen?.ensureLoaded()).resolves.not.toThrow()
  })

  it('offers addLocal and updateLocal as part of the contract', () => {
    expect(typeof seen?.addLocal).toBe('function')
    expect(typeof seen?.updateLocal).toBe('function')
  })
})
