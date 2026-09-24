import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import BillingBox from './index'

const CONTENT = 'Facturación'

describe('BillingBox', () => {
  // A screen's name is a heading or a screen reader has no way to jump to it.
  it('gives the screen name a real heading tag', () => {
    const html = renderToStaticMarkup(<BillingBox part="title">{CONTENT}</BillingBox>)
    expect(html).toContain('<h2')
    expect(html).toContain(CONTENT)
  })

  it('draws every other piece as a plain box wearing its own skin', () => {
    const html = renderToStaticMarkup(<BillingBox part="row">{CONTENT}</BillingBox>)
    expect(html).toContain('<div')
    expect(html).not.toContain('<h2')
  })

  it('tells two pieces apart by the class it puts on them', () => {
    const head = renderToStaticMarkup(<BillingBox part="head">{CONTENT}</BillingBox>)
    const hint = renderToStaticMarkup(<BillingBox part="hint">{CONTENT}</BillingBox>)
    expect(head).not.toBe(hint)
  })
})
