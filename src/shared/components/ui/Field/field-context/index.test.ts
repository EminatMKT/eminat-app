import { describe, it, expect } from 'vitest'
import { createElement, useContext } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import FieldContext from './index'

const ID = 'total'

function Control() {
  return createElement('input', useContext(FieldContext).control)
}

describe('FieldContext', () => {
  it('carries nothing by default', () => {
    expect(renderToStaticMarkup(createElement(Control))).toBe('<input/>')
  })

  it('carries what the Field provides down to the control', () => {
    const channel = { control: { id: ID } }
    const tree = createElement(FieldContext.Provider, { value: channel }, createElement(Control))
    expect(renderToStaticMarkup(tree)).toContain(`id="${ID}"`)
  })

  it('has nowhere to report a limit outside a Field', () => {
    let channel = {}
    const Peek = () => { channel = useContext(FieldContext); return null }
    renderToStaticMarkup(createElement(Peek))
    expect(channel).not.toHaveProperty('report')
  })
})
