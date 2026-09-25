import { describe, it, expect } from 'vitest'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CardField from './index'

const SLOTS: ComponentProps<typeof CardField>['slot'][] = ['date', 'status', 'concept', 'payee', 'amount', 'marker']
const CONTENT = 'x'
const classOf = (slot: ComponentProps<typeof CardField>['slot']) => {
  const html = renderToStaticMarkup(<CardField slot={slot}>{CONTENT}</CardField>)
  const found = /class="([^"]*)"/.exec(html)
  return found?.[1]
}

describe('CardField', () => {
  // A field is placed by its slot, never by its order: that is what keeps the amount on the
  // same edge of every card whatever else the card carries.
  it('gives every slot of a card its own place', () => {
    const classes = new Set(SLOTS.map(classOf))
    expect(classes.size).toBe(SLOTS.length)
  })

  it('draws only what it is handed', () => {
    expect(renderToStaticMarkup(<CardField slot="amount">$150.00</CardField>)).toContain('>$150.00<')
  })
})
