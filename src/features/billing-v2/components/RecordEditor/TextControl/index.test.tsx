import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { Field } from '@/shared/components/ui'
import TextControl from './index'

type Control = ReactElement<{ onChange: (event: unknown) => void; onBlur?: () => void }>

const ignore = () => undefined
// A fixture, not shipped copy.
const LABEL = 'Scheduled for'
const MAX = 12

const isControl = (node: ReactElement): node is Control => typeof node.props.onChange === 'function'

/** Draws the control inside a render —it asks its Field for a name with a hook— and keeps it. */
function capture(onChange: (value: string) => void, onBlur?: () => void): Control {
  const drawn: Control[] = []
  const Capture = () => {
    const control = TextControl({ kind: 'text', value: '', onChange, onBlur })
    if (isControl(control)) drawn.push(control)
    return control
  }
  renderToStaticMarkup(<Capture />)
  return drawn[0]
}

describe('TextControl', () => {
  it('asks the browser for the kind of box the field needs', () => {
    const day = renderToStaticMarkup(<TextControl kind="date" value="2026-09-30" onChange={ignore} />)
    const clock = renderToStaticMarkup(<TextControl kind="time" value="" onChange={ignore} />)
    expect(day).toContain('type="date"')
    expect(clock).toContain('type="time"')
  })

  it('gives a note room to be a note', () => {
    const html = renderToStaticMarkup(<TextControl kind="text" value="" multiline onChange={ignore} />)
    expect(html).toContain('<textarea')
  })

  // The box stops where the column does, and a phone opens the keypad the field needs.
  it('carries the length limit and the keyboard it is given', () => {
    const box = renderToStaticMarkup(<TextControl kind="text" value="" maxLength={MAX} inputMode="decimal" onChange={ignore} />)
    const note = renderToStaticMarkup(<TextControl kind="text" value="" multiline maxLength={MAX} onChange={ignore} />)
    expect(box).toContain(`maxLength="${MAX}"`)
    expect(box).toContain('inputMode="decimal"')
    expect(note).toContain(`maxLength="${MAX}"`)
  })

  // A screen reader reads the Field's label as the box's name, and clicking the label focuses it.
  it('is named by the Field it sits in', () => {
    const html = renderToStaticMarkup(<Field label={LABEL}><TextControl kind="text" value="" onChange={ignore} /></Field>)
    const target = html.match(/for="([^"]+)"/)?.[1]
    expect(target).toBeTruthy()
    expect(html).toContain(`id="${target}"`)
  })

  // The caller works in values; the browser event never leaves this file.
  it('reports what was typed, not the event it arrived in', () => {
    let typed = ''
    capture((value) => { typed = value }).props.onChange({ target: { value: '12.50' } })
    expect(typed).toBe('12.50')
  })

  // Leaving the box is what lets its message show; the control only has to say it happened.
  it('reports that the person left the box', () => {
    let left = false
    capture(ignore, () => { left = true }).props.onBlur?.()
    expect(left).toBe(true)
  })
})
