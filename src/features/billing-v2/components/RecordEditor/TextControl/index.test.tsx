import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { Field } from '@/shared/components/ui'
import TextControl from './index'

type Control = ReactElement<{ onChange: (event: unknown) => void }>
const ignore = () => undefined
// A fixture, not shipped copy.
const LABEL = 'Scheduled for'

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
    const remember = (value: string) => { typed = value }
    // Called inside a render, because the control asks its Field for a name with a hook.
    const drawn: Control[] = []
    const Capture = () => {
      const control = TextControl({ kind: 'text', value: '', onChange: remember }) as Control
      drawn.push(control)
      return control
    }
    renderToStaticMarkup(<Capture />)
    const handler = drawn[0].props.onChange
    handler({ target: { value: '12.50' } })
    expect(typed).toBe('12.50')
  })
})
