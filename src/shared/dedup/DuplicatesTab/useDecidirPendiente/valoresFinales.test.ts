import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import capturarHook from '../capturarHook'
import decidirArgsFixture from '../decidirArgsFixture'
import useDecidirPendiente from '.'

const mocks = vi.hoisted(() => ({ fusionar: vi.fn() }))
vi.mock('@/shared/dedup/data/fusionar', () => ({ default: mocks.fusionar }))

// The bug these guard against: the merge used to send only the clicked fields, so the RPC
// rejected any pair with a differing column nobody clicked (an empty side, a phone, an email).
describe('useDecidirPendiente merge values', () => {
  beforeEach(() => {
    mocks.fusionar.mockReset()
    mocks.fusionar.mockResolvedValue({ error: null })
  })

  it('sends what construirValoresFinales builds for the loaded pair, not the raw clicks', async () => {
    const elecciones = { nombre: 'Ana' }
    const construirValoresFinales = vi.fn(() => ({ nombre: 'Ana', telefono: '555-0002' }))
    const args = decidirArgsFixture({ elecciones, construirValoresFinales })
    const { fusionarPendiente } = capturarHook(() => useDecidirPendiente(args))

    await fusionarPendiente()

    expect(construirValoresFinales).toHaveBeenCalledWith(args.itemA, args.itemB, elecciones, [])
    expect(mocks.fusionar).toHaveBeenCalledWith({
      entidad: args.entidad,
      ganadorId: args.abierto?.item_id_a,
      perdedorId: args.abierto?.item_id_b,
      valoresFinales: { nombre: 'Ana', telefono: '555-0002' },
      excludedIds: [],
    })
  })

  it('does not merge while either side of the pair is not loaded', async () => {
    const { fusionarPendiente } = capturarHook(() => useDecidirPendiente(decidirArgsFixture({ itemB: null })))
    await fusionarPendiente()
    expect(mocks.fusionar).not.toHaveBeenCalled()
  })

  // The adapter needs the unchecked ids too: without them a blank winner column gets filled
  // with the very value the reviewer just dropped.
  it('hands the unchecked ids to construirValoresFinales and to the RPC', async () => {
    const construirValoresFinales = vi.fn(() => ({}))
    const args = decidirArgsFixture({ excludedIds: ['c1', 'c2'], construirValoresFinales })
    const { fusionarPendiente } = capturarHook(() => useDecidirPendiente(args))
    await fusionarPendiente()
    expect(construirValoresFinales).toHaveBeenCalledWith(args.itemA, args.itemB, {}, ['c1', 'c2'])
    expect(mocks.fusionar).toHaveBeenCalledWith(expect.objectContaining({ excludedIds: ['c1', 'c2'] }))
  })
})
