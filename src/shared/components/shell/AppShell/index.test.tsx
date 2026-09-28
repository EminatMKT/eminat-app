import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MAIN_ELEMENT } from '@/shared/constants/dom'
import AppShell from './index'

const marks = vi.hoisted(() => ({ loading: false, topbar: 'the topbar', spinner: 'the spinner', page: 'the module' }))
const absent = vi.hoisted(() => () => null)

vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ loading: marks.loading }) }))
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('@/shared/components/shell/Topbar', () => ({ default: () => marks.topbar }))
vi.mock('@/shared/components/shell/LoadingScreen', () => ({ default: () => marks.spinner }))
vi.mock('@/shared/components/shell/Sidebar', () => ({ default: absent }))
vi.mock('@/shared/components/shell/Onboarding', () => ({ default: absent }))

const draw = () => renderToStaticMarkup(<AppShell>{marks.page}</AppShell>)

beforeEach(() => { marks.loading = false })

describe('AppShell', () => {
  // A header inside `main` is not a banner: the topbar has to come before main, not within it.
  it('puts the topbar beside main, and the page inside it', () => {
    const html = draw()
    const opens = html.indexOf(`<${MAIN_ELEMENT}`)
    const closes = html.indexOf(`</${MAIN_ELEMENT}>`)
    expect(html.indexOf(marks.topbar)).toBeLessThan(opens)
    expect(html.indexOf(marks.page)).toBeGreaterThan(opens)
    expect(html.indexOf(marks.page)).toBeLessThan(closes)
  })

  it('shows only the loading screen while the session loads', () => {
    marks.loading = true
    expect(draw()).toBe(marks.spinner)
  })
})
