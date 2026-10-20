import {
  describe,
  it,
  expect,
  vi,
} from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import useRegistryState from '../useRegistryState'
import mutations from '../mutations'
import pacienteFixture from '../fixture'
import dedupSignal from '../dedupSignal'
import type { Paciente } from '@/features/medical/types'
import { usePacientes } from '..'

vi.mock('../useRegistryState', () => ({ default: vi.fn() }))
vi.mock('../mutations', () => ({ default: { add: vi.fn(), edit: vi.fn() } }))
vi.mock('../dedupSignal', () => ({ default: vi.fn() }))

let seen: ReturnType<typeof usePacientes> | null = null

function Probe() {
  seen = usePacientes()
  return null
}

function renderWithRoster(pacientes: Paciente[]) {
  const minimalRegistry = {
    pacientes,
    pacienteFuentes: [],
    pacienteContactos: [],
    loading: false,
    loaded: true,
    recargar: vi.fn(),
    ensureLoaded: vi.fn(),
    addLocal: vi.fn(),
    updateLocal: vi.fn(),
  }
  vi.mocked(useRegistryState).mockReturnValue(minimalRegistry)
  renderToStaticMarkup(createElement(Probe))
}

describe('usePacientes roster threading across sequential addPaciente calls', () => {
  it('passes each addPaciente call the roster as it stood at THAT render, not a stale one', async () => {
    const firstPatient = pacienteFixture({ id: 'p1', nombre: 'Ana' })
    const secondPatient = pacienteFixture({ id: 'p2', nombre: 'Beto' })
    vi.mocked(mutations.add)
      .mockResolvedValueOnce({ data: firstPatient })
      .mockResolvedValueOnce({ data: secondPatient })

    renderWithRoster([])
    await seen?.addPaciente({ nombre: 'Ana' })

    renderWithRoster([firstPatient])
    await seen?.addPaciente({ nombre: 'Beto' })

    expect(dedupSignal).toHaveBeenNthCalledWith(1, firstPatient, [])
    expect(dedupSignal).toHaveBeenNthCalledWith(2, secondPatient, [firstPatient])
  })
})
