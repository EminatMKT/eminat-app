import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DIALOG } from '@/shared/constants/dom'
import ShellDrawer from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

// A fixture, not shipped copy.
const NAV = 'fixture navigation'
// The i18n mock answers with the key itself, so the drawer is named by its key.
const NAME_KEY = 'shell.navigation'
const ignore = () => undefined
const draw = (open: boolean) => renderToStaticMarkup(<ShellDrawer open={open} onClose={ignore}>{NAV}</ShellDrawer>)

describe('ShellDrawer', () => {
  // Closed —always, on a wide screen— the sidebar is only a box in the row: no dialog, no scrim.
  it('draws the sidebar as a plain box while closed', () => {
    const html = draw(false)
    expect(html).toContain(NAV)
    expect(html).not.toContain('role=')
    expect(html).not.toContain('aria-modal')
  })

  // Open on a phone it covers the page like a modal, so it is one: named, modal, holding the focus.
  it('makes the open drawer a named modal dialog over a scrim', () => {
    const html = draw(true)
    expect(html).toContain(`role="${DIALOG}"`)
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain(`aria-label="${NAME_KEY}"`)
    expect(html).toContain('tabindex="-1"')
    expect(html.indexOf('<div')).toBeLessThan(html.indexOf(`role="${DIALOG}"`))
  })
})
