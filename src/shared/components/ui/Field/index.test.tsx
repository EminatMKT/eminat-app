import { describe, it, expect } from 'vitest'
import { createElement, type ComponentProps, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Field from './index'
import useFieldControl from './useFieldControl'

// Fixtures, not shipped copy: callers hand Field text their own locale already produced.
const LABEL = 'Due date'
const ERROR = 'Choose a day'
const OWN_ID = 'due'

type Setup = Omit<ComponentProps<typeof Field>, 'children' | 'label'>
const attribute = (html: string, name: string) => html.match(new RegExp(`${name}="([^"]*)"`))?.[1]
const box = (id?: string) => createElement('input', { id })
const draw = (setup: Setup, control: ReactNode = box()) =>
  renderToStaticMarkup(<Field label={LABEL} {...setup}>{control}</Field>)

// A control drawn by a component, not a native tag: it asks the Field for its name.
function Composed() {
  return createElement('input', useFieldControl())
}

const plain = draw({})
const wrong = draw({ error: ERROR })

describe('Field', () => {
  // Clicking the text moves the cursor into the box: the cheapest proof they are tied.
  it('points its visible label at the native control it holds', () => {
    const target = attribute(plain, 'for')
    expect(target).toBeTruthy()
    expect(plain).toContain(`id="${target}"`)
  })

  it('keeps an id the caller already gave its control', () => {
    expect(draw({}, box(OWN_ID))).toContain(`for="${OWN_ID}"`)
  })

  it('names a control drawn by a component, through useFieldControl', () => {
    const html = draw({}, <Composed />)
    expect(html).toContain(`id="${attribute(html, 'for')}"`)
  })

  it('says nothing is wrong while there is no error', () => {
    expect(plain).not.toContain('aria-invalid')
    expect(plain).not.toContain('aria-describedby')
  })

  it('marks the control invalid and describes it with its error', () => {
    const errorId = attribute(wrong, 'aria-describedby')
    expect(wrong).toContain('aria-invalid="true"')
    expect(wrong).toMatch(new RegExp(`id="${errorId}"[^>]*>${ERROR}<`))
  })

  // The error belongs to one box, so it sits right under that box and not at the end of the form.
  it('draws the error under the control, outside the label', () => {
    expect(wrong.indexOf('<input')).toBeLessThan(wrong.indexOf(ERROR))
    expect(wrong.indexOf('</label>')).toBeLessThan(wrong.indexOf('<input'))
  })

  it('tells assistive technology that a required field is required', () => {
    expect(draw({ required: true })).toContain('aria-required="true"')
  })
})
