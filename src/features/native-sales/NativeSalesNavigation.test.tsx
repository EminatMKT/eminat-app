import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import en from '@/shared/i18n/locales/en.json'
const state = vi.hoisted(() => ({ pathname: '/sales-native', search: 'section=payments' }))
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname,
  useSearchParams: () => new URLSearchParams(state.search), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: keyof typeof en) => en[key] }) }))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ esAdmin: true, accent: '#9b87ff' }) }))
import SidebarPanel from '@/shared/components/shell/SidebarPanel'
beforeEach(() => { state.pathname = '/sales-native'; state.search = 'section=payments' })
describe('Sales-only secondary sidebar integration', () => {
  it('renders all unique Sales destinations as accessible deep links with a single active item', () => {
    const html = renderToStaticMarkup(<SidebarPanel open panel="sales" setMobileOpen={() => {}} />)
    expect(html.match(/href="\/sales-native\?/g)).toHaveLength(13)
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toContain('aria-label="Sales sections"') // i18n-ignore: serialized markup assertion, not user-facing copy
    expect(html).toContain('Payments &amp; Renewals')
    expect(html).toContain('Portal Leads')
    expect(html).not.toContain('<button')
  })
  it('preserves the existing secondary navigation of unrelated modules', () => {
    state.pathname = '/medical'
    const html = renderToStaticMarkup(<SidebarPanel open panel="medical" setMobileOpen={() => {}} />)
    expect(html).toContain('<button')
    expect(html).not.toContain('/sales-native')
    expect(html).not.toContain('Sales sections')
  })
  it('does not replace legacy Sales navigation outside the native Sales route', () => {
    state.pathname = '/sales'
    const html = renderToStaticMarkup(<SidebarPanel open panel="sales" setMobileOpen={() => {}} />)
    expect(html).toContain('<button')
    expect(html).not.toContain('/sales-native')
  })
})
