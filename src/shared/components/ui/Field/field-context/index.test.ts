import { describe, it, expect } from 'vitest'
import { createElement, useContext } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import FieldContext from './index'

const ID = 'total'

function Control() {
  return createElement('input', useContext(FieldContext))
}

describe('FieldContext', () => {
  it('carries nothing by default', () => {
    expect(renderToStaticMarkup(createElement(Control))).toBe('<input/>')
  })

  it('carries what the Field provides down to the control', () => {
    const tree = createElement(FieldContext.Provider, { value: { id: ID } }, createElement(Control))
    expect(renderToStaticMarkup(tree)).toContain(`id="${ID}"`)
  })
})
