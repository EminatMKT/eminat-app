import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import capturarHook from '../capturarHook'
import pendienteFixture from '@/shared/dedup/DuplicatesTab/pendienteFixture'
import useListaDuplicados from '.'

const mocks = vi.hoisted(() => ({
  listPendientes: vi.fn(),
  escanear: vi.fn(),
}))
vi.mock('@/shared/dedup/data/listPendientes', () => ({ default: mocks.listPendientes }))
vi.mock('@/shared/dedup/data/escanear', () => ({ default: mocks.escanear }))

const noSummaries = async () => ({})
const emptyList = { data: [] }
const scanOk = { error: null }
const scanDenied = { error: new Error('denied') }
const listDenied = { data: null, error: new Error('denied') }
const onePair = { data: [pendienteFixture()], error: null }
const laterIds = { item_id_a: 'c', item_id_b: 'd' }
const newerList = { data: [pendienteFixture(laterIds)], error: null }

describe('useListaDuplicados', () => {
  beforeEach(() => {
    mocks.listPendientes.mockReset().mockResolvedValue(emptyList)
    mocks.escanear.mockReset().mockResolvedValue(scanOk)
  })

  // The effect that calls `listPendientes` never runs under `renderToStaticMarkup`, so this only
  // asserts the hook's initial values, not the fetch.
  it('starts empty and idle', () => {
    const { pendientes, ocupado } = capturarHook(() => useListaDuplicados('pacientes', noSummaries))
    expect(pendientes.length).toBe(0)
    expect(ocupado).toBe(false)
  })

  it('reloads the list after a successful scan', async () => {
    const { escanearPendientes } = capturarHook(() => useListaDuplicados('pacientes', noSummaries))
    await escanearPendientes()
    expect(mocks.escanear).toHaveBeenCalledWith('pacientes')
    expect(mocks.listPendientes).toHaveBeenCalledWith('pacientes')
  })

  it('does not reload when the scan itself fails', async () => {
    mocks.escanear.mockResolvedValue(scanDenied)
    const { escanearPendientes } = capturarHook(() => useListaDuplicados('pacientes', noSummaries))
    await escanearPendientes()
    expect(mocks.listPendientes).not.toHaveBeenCalled()
  })

  it('does not throw when the list itself fails to load', async () => {
    mocks.listPendientes.mockResolvedValue(listDenied)
    const { recargar } = capturarHook(() => useListaDuplicados('pacientes', noSummaries))
    await expect(recargar()).resolves.toBeUndefined()
  })

  // Names never hold the queue back: a hung name read must not hang the reload or the scan.
  it('finishes reloading and scanning while names are still loading', async () => {
    mocks.listPendientes.mockResolvedValue(onePair)
    const hung = () => new Promise<Record<string, string>>(() => {})
    const { recargar, escanearPendientes } = capturarHook(() => useListaDuplicados('pacientes', hung))
    await expect(recargar()).resolves.toBeUndefined()
    await expect(escanearPendientes()).resolves.toBeUndefined()
  })

  // The bug this guards against: an older reload answering late put back a stale queue.
  it('drops a reload that answers after a newer one', async () => {
    let releaseFirst = (_: unknown) => {}
    mocks.listPendientes
      .mockReturnValueOnce(new Promise(resolve => { releaseFirst = resolve }))
      .mockResolvedValueOnce(newerList)
    const loadSummaries = vi.fn(async (_ids: string[]) => ({}))
    const { recargar } = capturarHook(() => useListaDuplicados('pacientes', loadSummaries))
    const first = recargar()
    await recargar()
    releaseFirst(onePair)
    await first
    expect(loadSummaries).toHaveBeenCalledOnce()
    expect(loadSummaries).toHaveBeenCalledWith(['c', 'd'])
  })
})
