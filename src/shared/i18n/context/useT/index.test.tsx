import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import useT from './index'

function WithoutProvider() {
  useT()
  return null
}

it('rejects use outside the locale provider', () => {
  expect(() => renderToStaticMarkup(<WithoutProvider />)).toThrow()
})
