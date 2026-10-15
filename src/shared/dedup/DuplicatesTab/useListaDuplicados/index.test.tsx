import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import capturarHook from '../capturarHook'
import useListaDuplicados from '.'

const mocks = vi.hoisted(() => ({
  listPendientes: vi.fn(),
  escanear: vi.fn(),
}))
vi.mock('@/shared/dedup/data/listPendientes', () => ({ default: mocks.listPendientes }))
vi.mock('@/shared/dedup/data/escanear', () => ({ default: mocks.escanear }))

describe('useListaDuplicados', () => {
  beforeEach(() => {
    mocks.listPendientes.mockReset().mockResolvedValue({ data: [] })
    mocks.escanear.mockReset().mockResolvedValue({ error: null })
  })

  // The effect that calls `listPendientes` never runs under `renderToStaticMarkup`, so this only
  // asserts the hook's initial values, not the fetch.
  it('starts empty and idle', () => {
    const { pendientes, ocupado } = capturarHook(() => useListaDuplicados('pacientes'))
    expect(pendientes.length).toBe(0)
    expect(ocupado).toBe(false)
  })

  it('reloads the list after a successful scan', async () => {
    const { escanearPendientes } = capturarHook(() => useListaDuplicados('pacientes'))
    await escanearPendientes()
    expect(mocks.escanear).toHaveBeenCalledWith('pacientes')
    expect(mocks.listPendientes).toHaveBeenCalledWith('pacientes')
  })

  it('does not reload when the scan itself fails', async () => {
    mocks.escanear.mockResolvedValue({ error: new Error('denied') })
    const { escanearPendientes } = capturarHook(() => useListaDuplicados('pacientes'))
    await escanearPendientes()
    expect(mocks.listPendientes).not.toHaveBeenCalled()
  })

  it('does not throw when the list itself fails to load', async () => {
    mocks.listPendientes.mockResolvedValue({ data: null, error: new Error('denied') })
    const { recargar } = capturarHook(() => useListaDuplicados('pacientes'))
    await expect(recargar()).resolves.toBeUndefined()
  })
})
