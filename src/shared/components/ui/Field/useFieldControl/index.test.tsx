import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import useFieldControl from './index'

// A control outside any Field: the hook has nothing to hand it.
function Loose() {
  return createElement('input', useFieldControl())
}

describe('useFieldControl', () => {
  // TextControl is also drawn alone in its own tests: the hook must not require a Field around.
  it('hands nothing to a control that sits in no Field', () => {
    const html = renderToStaticMarkup(<Loose />)
    expect(html).toBe('<input/>')
  })
})
