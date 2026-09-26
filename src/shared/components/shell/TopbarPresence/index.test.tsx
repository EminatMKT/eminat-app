import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TopbarPresence from './index'

const presence = vi.hoisted(() => ({ count: 0 }))

vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ onlineCount: presence.count }) }))
vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string, vars: Record<string, number>) => `${key}:${vars.n}` }),
}))

beforeEach(() => { presence.count = 3 })

describe('TopbarPresence', () => {
  // The wide pill says the count in words; the phone one keeps only the number next to the dot.
  it('says how many are online, with a bare number as the phone copy', () => {
    const html = renderToStaticMarkup(<TopbarPresence />)
    expect(html).toContain('shell.online:3')
    expect(html).toContain('>3<')
  })

  // Whoever is looking is online, even before presence has counted anyone.
  it('never says nobody is online', () => {
    presence.count = 0
    expect(renderToStaticMarkup(<TopbarPresence />)).toContain('shell.online:1')
  })
})
