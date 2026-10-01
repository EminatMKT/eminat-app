import { expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import LocaleContext from './index'

it('does not invent a locale without a provider', () => {
  const read = vi.fn(() => null)
  renderToStaticMarkup(<LocaleContext.Consumer>{read}</LocaleContext.Consumer>)
  expect(read).toHaveBeenCalledWith(null)
})
