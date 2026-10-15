import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import capturarHook from '../capturarHook'
import pendienteFixture from '../pendienteFixture'
import useAbrirPendiente from '.'

describe('useAbrirPendiente', () => {
  it('starts with nothing open', () => {
    const { abierto, itemA, itemB } = capturarHook(() => useAbrirPendiente(async id => ({ id })))
    expect(abierto).toBeNull()
    expect(itemA).toBeNull()
    expect(itemB).toBeNull()
  })

  it('loads both sides of a pair', async () => {
    const cargarItem = vi.fn(async (id: string) => ({ id }))
    const { abrirPendiente } = capturarHook(() => useAbrirPendiente(cargarItem))
    await abrirPendiente(pendienteFixture())
    expect(cargarItem).toHaveBeenCalledWith('a')
    expect(cargarItem).toHaveBeenCalledWith('b')
  })

  // A failed load is caught, not an unhandled rejection the caller's `void abrirPendiente(par)`
  // would otherwise drop silently.
  it('does not throw when cargarItem rejects', async () => {
    const cargarItem = vi.fn(async () => { throw new Error('network') })
    const { abrirPendiente } = capturarHook(() => useAbrirPendiente(cargarItem))
    await expect(abrirPendiente(pendienteFixture())).resolves.toBeUndefined()
  })

  // The request counter is the actual guard; what's directly observable without a re-render is
  // that firing two opens back to back still resolves both loads instead of hanging or throwing.
  it('does not throw when two opens are requested back to back', async () => {
    const segunda = pendienteFixture({ item_id_a: 'c', item_id_b: 'd' })
    const cargarItem = vi.fn(async (id: string) => ({ id }))
    const { abrirPendiente } = capturarHook(() => useAbrirPendiente(cargarItem))
    const primero = abrirPendiente(pendienteFixture())
    const segundo = abrirPendiente(segunda)
    await expect(Promise.all([primero, segundo])).resolves.toBeDefined()
    expect(cargarItem).toHaveBeenCalledTimes(4)
  })
})
