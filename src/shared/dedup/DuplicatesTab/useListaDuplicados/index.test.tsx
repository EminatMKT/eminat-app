import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import useListaDuplicados from '.'

vi.mock('@/shared/dedup/data/listPendientes', () => ({ default: () => Promise.resolve({ data: [] }) }))
vi.mock('@/shared/dedup/data/escanear', () => ({ default: () => Promise.resolve() }))

function Sonda() {
  const { pendientes, ocupado } = useListaDuplicados('pacientes')
  return <>{`${pendientes.length} ${ocupado}`}</>
}

describe('useListaDuplicados', () => {
  // The effect that calls `listPendientes` never runs under `renderToStaticMarkup`, so this only
  // asserts the hook's initial values, not the fetch.
  it('starts empty and idle', () => {
    expect(renderToStaticMarkup(<Sonda />)).toBe('0 false')
  })
})
