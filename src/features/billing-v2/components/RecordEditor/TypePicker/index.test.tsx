import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TypePicker from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const ignore = () => undefined

describe('TypePicker', () => {
  it('offers the three kinds of record while the record is new', () => {
    const html = renderToStaticMarkup(<TypePicker current="payment" locked={false} onPick={ignore} />)
    expect(html).toContain('billing.type.payment')
    expect(html).toContain('billing.type.event')
    expect(html).toContain('billing.type.monthNote')
    expect(html).toContain('aria-pressed="true"')
  })

  // The type is immutable after insert: a payment turned event would lose its amount silently.
  it('offers no choice once the record exists, and says why', () => {
    const html = renderToStaticMarkup(<TypePicker current="event" locked onPick={ignore} />)
    expect(html).toContain('billing.typeLocked')
    expect(html).not.toContain('aria-pressed')
  })
})
