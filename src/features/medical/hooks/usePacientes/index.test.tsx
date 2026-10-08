import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import useRegistryState from './useRegistryState'
import mutations from './mutations'
import pacienteFixture from './fixture'
import type { Paciente } from '@/features/medical/types'
import { usePacientes } from './index'

vi.mock('./useRegistryState', () => ({ default: vi.fn() }))
vi.mock('./mutations', () => ({ default: { add: vi.fn(), edit: vi.fn() } }))

const registryState = {
  pacientes: [] as Paciente[],
  pacienteFuentes: [],
  pacienteContactos: [],
  loading: false,
  loaded: false,
  recargar: vi.fn(),
  ensureLoaded: vi.fn(),
  addLocal: vi.fn(),
  updateLocal: vi.fn(),
}

let seen: ReturnType<typeof usePacientes> | null = null
function Probe() {
  seen = usePacientes()
  return null
}

describe('usePacientes', () => {
  beforeEach(() => {
    seen = null
    registryState.addLocal.mockReset()
    registryState.updateLocal.mockReset()
    vi.mocked(useRegistryState).mockReturnValue(registryState)
    renderToStaticMarkup(<Probe />)
  })

  it('forwards the registry state as its own contract', () => {
    expect(seen?.pacientes).toBe(registryState.pacientes)
    expect(seen?.loading).toBe(false)
    expect(seen?.loaded).toBe(false)
  })

  it('adds through mutations.add, then updates the local list on success', async () => {
    const landed = { data: pacienteFixture() }
    vi.mocked(mutations.add).mockResolvedValue(landed)
    const input = { nombre: 'Ana' }
    await seen?.addPaciente(input)
    expect(vi.mocked(mutations.add)).toHaveBeenCalledWith(input)
    expect(registryState.addLocal).toHaveBeenCalledWith(landed.data)
  })

  it('does not touch the local list when mutations.add fails', async () => {
    const failed = { error: { message: 'boom' } } as Awaited<ReturnType<typeof mutations.add>>
    vi.mocked(mutations.add).mockResolvedValue(failed)
    const empty = {}
    await seen?.addPaciente(empty)
    expect(registryState.addLocal).not.toHaveBeenCalled()
  })

  it('edits through mutations.edit, then replaces the local entry on success', async () => {
    const landed = { data: pacienteFixture() }
    vi.mocked(mutations.edit).mockResolvedValue(landed)
    const input = { nombre: 'Ana' }
    await seen?.editPaciente('p1', input)
    expect(registryState.updateLocal).toHaveBeenCalledWith('p1', landed.data)
  })
})
