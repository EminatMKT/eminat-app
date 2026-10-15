import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import capturarHook from '../capturarHook'
import pendienteFixture from '../pendienteFixture'
import useDecidirPendiente from '.'

const mocks = vi.hoisted(() => ({
  descartar: vi.fn(),
  fusionar: vi.fn(),
}))
vi.mock('@/shared/dedup/data/descartar', () => ({ default: mocks.descartar }))
vi.mock('@/shared/dedup/data/fusionar', () => ({ default: mocks.fusionar }))

const abierto = pendienteFixture()

describe('useDecidirPendiente', () => {
  beforeEach(() => {
    mocks.descartar.mockReset()
    mocks.fusionar.mockReset()
  })

  it('starts idle without error', () => {
    const { ocupado, error } = capturarHook(() => useDecidirPendiente('pacientes', null, {}, () => {}))
    expect(ocupado).toBe(false)
    expect(error).toBe(false)
  })

  it('calls alDecidir after a successful discard', async () => {
    mocks.descartar.mockResolvedValue({ error: null })
    const alDecidir = vi.fn()
    const { descartarPendiente } = capturarHook(() => useDecidirPendiente('pacientes', abierto, {}, alDecidir))
    await descartarPendiente('no_son_la_misma', null)
    expect(alDecidir).toHaveBeenCalledOnce()
  })

  // The bug this guards against: a failed discard used to reset and reload anyway, so the pair
  // silently came back as if nothing had happened.
  it('does not call alDecidir when the discard fails', async () => {
    mocks.descartar.mockResolvedValue({ error: new Error('denied') })
    const alDecidir = vi.fn()
    const { descartarPendiente } = capturarHook(() => useDecidirPendiente('pacientes', abierto, {}, alDecidir))
    await descartarPendiente('no_son_la_misma', null)
    expect(alDecidir).not.toHaveBeenCalled()
  })

  it('calls alDecidir after a successful merge', async () => {
    mocks.fusionar.mockResolvedValue({ error: null })
    const alDecidir = vi.fn()
    const { fusionarPendiente } = capturarHook(() => useDecidirPendiente('pacientes', abierto, {}, alDecidir))
    await fusionarPendiente()
    expect(alDecidir).toHaveBeenCalledOnce()
  })

  it('does not call alDecidir when the merge fails', async () => {
    mocks.fusionar.mockResolvedValue({ error: new Error('missing field') })
    const alDecidir = vi.fn()
    const { fusionarPendiente } = capturarHook(() => useDecidirPendiente('pacientes', abierto, {}, alDecidir))
    await fusionarPendiente()
    expect(alDecidir).not.toHaveBeenCalled()
  })
})
