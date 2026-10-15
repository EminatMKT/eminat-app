import {
  describe,
  expect,
  it,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import useDecidirPendiente from '.'

const elecciones = {}
const alDecidir = () => {}

function Sonda() {
  const { ocupado, error } = useDecidirPendiente('pacientes', null, elecciones, alDecidir)
  return <>{`${ocupado} ${error}`}</>
}

describe('useDecidirPendiente', () => {
  it('starts idle without error', () => {
    expect(renderToStaticMarkup(<Sonda />)).toBe('false false')
  })
})
