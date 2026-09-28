import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import useFieldControl from './index'

const LIMIT = { length: 3, max: 10 }

type LooseProps = { limit?: typeof LIMIT }

// A control outside any Field: the hook has nothing to hand it, whether it reports a limit or not.
function Loose({ limit }: LooseProps) {
  return createElement('input', useFieldControl(limit))
}

describe('useFieldControl', () => {
  // TextControl is also drawn alone in its own tests: the hook must not require a Field around.
  it('hands nothing to a control that sits in no Field', () => {
    const html = renderToStaticMarkup(<Loose />)
    expect(html).toBe('<input/>')
  })

  it('hands nothing either when the lone control reports a limit', () => {
    expect(renderToStaticMarkup(<Loose limit={LIMIT} />)).toBe('<input/>')
  })
})
