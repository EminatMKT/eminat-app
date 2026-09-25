import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TextControl from './index'

const ignore = () => undefined

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

  // The caller works in values; the browser event never leaves this file.
  it('reports what was typed, not the event it arrived in', () => {
    let typed = ''
    const remember = (value: string) => { typed = value }
    const box = TextControl({ kind: 'text', value: '', onChange: remember })
    const handler = box.props.onChange as (event: unknown) => void
    handler({ target: { value: '12.50' } })
    expect(typed).toBe('12.50')
  })
})
