import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ALERT } from '@/shared/constants/dom'
import WarningCallout from './index'

const MESSAGE = 'Could not merge'
const POLITE = 'status'
const ROLE = /role="(\w+)"/

const roleOf = (html: string) => {
  const [, role] = ROLE.exec(html) ?? []
  return role
}

describe('WarningCallout', () => {
  it('is a polite status line by default', () => {
    const html = renderToStaticMarkup(<WarningCallout message={MESSAGE} />)
    expect(roleOf(html)).toBe(POLITE)
  })

  // A failure that appears with its text has to be an alert, or a screen reader may skip it.
  it('announces a failed action at once when asked to', () => {
    const html = renderToStaticMarkup(<WarningCallout message={MESSAGE} role={ALERT} />)
    expect(roleOf(html)).toBe(ALERT)
  })
})
