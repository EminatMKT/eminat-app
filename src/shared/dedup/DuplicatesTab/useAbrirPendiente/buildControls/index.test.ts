import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import buildControls from '.'

describe('buildControls', () => {
  it('bundles the choices and the exclusions behind the names a comparison grid reads', () => {
    const onElegir = vi.fn()
    const onToggleExcluded = vi.fn()
    const controls = buildControls({ nombre: 'Ana' }, onElegir, ['c1'], onToggleExcluded)
    expect(controls).toEqual({
      choices: { nombre: 'Ana' },
      onChoose: onElegir,
      excludedIds: ['c1'],
      onToggleExcluded,
    })
  })
})
