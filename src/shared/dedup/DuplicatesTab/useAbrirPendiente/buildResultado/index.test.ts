import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import pendienteFixture from '@/shared/dedup/DuplicatesTab/pendienteFixture'
import buildResultado from '.'

function mockCallbacks() {
  const callbacks = {
    abrirPendiente: vi.fn(),
    cerrarPendiente: vi.fn(),
    onElegir: vi.fn(),
    onToggleExcluded: vi.fn(),
  }
  return callbacks
}

function mockControls(callbacks: ReturnType<typeof mockCallbacks>, choices: Record<string, string>, excludedIds: string[]) {
  const controls = {
    choices,
    onChoose: callbacks.onElegir,
    excludedIds,
    onToggleExcluded: callbacks.onToggleExcluded,
  }
  return controls
}

describe('buildResultado', () => {
  it('bundles the loaded pair, its choices and every setter into the hook contract', () => {
    const pendiente = pendienteFixture()
    const estado = {
      parCargado: { pendiente, a: { id: 'a' }, b: { id: 'b' } },
      elecciones: { nombre: 'Ana' },
      excludedIds: ['c1'],
      error: false,
    }
    const callbacks = mockCallbacks()
    const controls = mockControls(callbacks, estado.elecciones, estado.excludedIds)
    const resultado = buildResultado(estado, callbacks, controls)
    expect(resultado.abierto).toEqual(pendiente)
    expect(resultado.itemA).toEqual({ id: 'a' })
    expect(resultado.itemB).toEqual({ id: 'b' })
    expect(resultado.excludedIds).toEqual(['c1'])
    expect(resultado.controls).toBe(controls)
  })

  it('reads a never-opened pair as null', () => {
    const estado = {
      parCargado: null,
      elecciones: {},
      excludedIds: [],
      error: false,
    }
    const callbacks = mockCallbacks()
    const controls = mockControls(callbacks, estado.elecciones, estado.excludedIds)
    const resultado = buildResultado(estado, callbacks, controls)
    expect(resultado.abierto).toBeNull()
    expect(resultado.itemA).toBeNull()
    expect(resultado.itemB).toBeNull()
  })
})
