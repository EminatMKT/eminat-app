import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SaveStatus from './index'

// A fixture, not shipped copy.
const TEXT = 'fixture notice'

describe('SaveStatus', () => {
  // A refused save is announced the moment it happens and can take the focus.
  it('announces a failed write as an alert that can be focused', () => {
    const html = renderToStaticMarkup(<SaveStatus tone="failure">{TEXT}</SaveStatus>)
    expect(html).toContain('role="alert"')
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain(TEXT)
  })

  // Why Save is disabled is a status, read politely as it changes, not an alarm.
  it('says why Save is held back as a polite status', () => {
    const html = renderToStaticMarkup(<SaveStatus tone="reason">{TEXT}</SaveStatus>)
    expect(html).toContain('role="status"')
    expect(html).not.toContain('tabindex')
  })
})
