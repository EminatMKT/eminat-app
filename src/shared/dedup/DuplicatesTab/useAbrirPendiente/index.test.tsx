import {
  describe,
  expect,
  it,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import useAbrirPendiente from '.'

const cargarItem = async (id: string) => ({ id })

function Sonda() {
  const { abierto, itemA, itemB } = useAbrirPendiente(cargarItem)
  return <>{`${abierto} ${itemA} ${itemB}`}</>
}

describe('useAbrirPendiente', () => {
  it('starts with nothing open', () => {
    expect(renderToStaticMarkup(<Sonda />)).toBe('null null null')
  })
})
