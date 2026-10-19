import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import capturarHook from '../capturarHook'
import useDuplicatesTab from '.'

const mocks = vi.hoisted(() => ({ fusionar: vi.fn() }))
vi.mock('@/shared/dedup/data/fusionar', () => ({ default: mocks.fusionar }))

type Item = { id: string }

const props = {
  entidad: 'pacientes',
  cargarItem: async (id: string): Promise<Item> => ({ id }),
  renderResumen: (item: Item) => item.id,
  renderComparacion: () => null,
  construirValoresFinales: () => ({}),
  loadSummaries: async () => ({}),
}

describe('useDuplicatesTab', () => {
  it('starts with an empty queue, no open pair and no failure', () => {
    const { list, pair, resolve } = capturarHook(() => useDuplicatesTab(props))
    expect(list.pendientes).toEqual([])
    expect(pair.abierto).toBeNull()
    expect(list.error || pair.error || resolve.errorFusion || resolve.errorDescarte).toBe(false)
  })

  it('does not merge while no pair is open', async () => {
    const { resolve } = capturarHook(() => useDuplicatesTab(props))
    await resolve.fusionarPendiente()
    expect(mocks.fusionar).not.toHaveBeenCalled()
  })
})
