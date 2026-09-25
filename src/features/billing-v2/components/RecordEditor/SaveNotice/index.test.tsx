import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SaveNotice from './index'

// A fixture, not shipped copy.
const TEXT = 'fixture notice'

describe('SaveNotice', () => {
  // A refused save is announced the moment it happens and can take the focus.
  it('announces a failed write as an alert that can be focused', () => {
    const html = renderToStaticMarkup(<SaveNotice tone="failure">{TEXT}</SaveNotice>)
    expect(html).toContain('role="alert"')
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain(TEXT)
  })

  // Why Save is disabled is a status, read politely as it changes, not an alarm.
  it('says why Save is held back as a polite status', () => {
    const html = renderToStaticMarkup(<SaveNotice tone="reason">{TEXT}</SaveNotice>)
    expect(html).toContain('role="status"')
    expect(html).not.toContain('tabindex')
  })
})
