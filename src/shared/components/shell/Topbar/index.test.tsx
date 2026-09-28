import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { HEADER_ELEMENT } from '@/shared/constants/dom'
import Topbar from './index'

// The i18n mock answers with the key itself, so the menu button is named by its key.
const MENU_KEY = 'shell.openMenu'
const MENU = `aria-label="${MENU_KEY}"`
const piece = vi.hoisted(() => () => null)

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('@/shared/components/shell/NotificationsBell', () => ({ default: piece }))
vi.mock('@/shared/components/shell/DevBadge', () => ({ default: piece }))
vi.mock('@/shared/components/shell/TopbarHeading', () => ({ default: piece }))
vi.mock('@/shared/components/shell/TopbarPresence', () => ({ default: piece }))
vi.mock('@/shared/components/shell/ThemeToggle', () => ({ default: piece }))
vi.mock('@/shared/components/shell/TopbarMessage', () => ({ default: piece }))

const openMenu = () => undefined
const draw = () => renderToStaticMarkup(<Topbar onHamburger={openMenu} />)

describe('Topbar', () => {
  // The bar is the page's banner landmark: that is how assistive tech and the e2e find it.
  it('is a header', () => {
    expect(draw().startsWith(`<${HEADER_ELEMENT}`)).toBe(true)
  })

  // On a phone the navigation folds away: the bar carries the button that brings it back.
  it('carries a named button that opens the navigation', () => {
    expect(draw()).toContain(MENU)
  })
})
