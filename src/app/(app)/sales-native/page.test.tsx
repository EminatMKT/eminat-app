import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import en from '@/shared/i18n/locales/en.json'

const mocks = vi.hoisted(() => ({ organizations: vi.fn(), enabled: vi.fn(), user: vi.fn(), admin: vi.fn() }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND') } }))
vi.mock('@/server/sales-native/release-gate', () => ({ nativeSalesEnabled: mocks.enabled }))
vi.mock('@/server/sales-native/auth', () => ({ readSalesOrganizations: mocks.organizations }))
vi.mock('@/shared/db/requireAccess/ssrClient', () => ({ default: () => ({ auth: { getUser: mocks.user } }) }))
vi.mock('@/shared/db/supabaseAdmin', () => ({ supabaseAdmin: mocks.admin }))
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: keyof typeof en) => en[key] }) }))
vi.mock('@/features/native-sales/NativeSalesModule', () => ({
  default: ({ organizationId }: { organizationId: string }) =>
    <div data-testid="native-records" data-organization-id={organizationId} />,
}))
import Page from './page'

const stratix = { organizationId: '11111111-1111-4111-8111-111111111111', name: 'Stratix', code: 'stratix', role: 'SUPERADMIN' }
const emc = { organizationId: '22222222-2222-4222-8222-222222222222', name: 'EMC', code: 'emc', role: 'SUPERADMIN' }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.enabled.mockReturnValue(true)
  mocks.user.mockResolvedValue({ data: { user: { id: 'auth-id' } } })
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query)
  query.maybeSingle.mockResolvedValue({ data: { id: 'profile-id' }, error: null })
  mocks.admin.mockReturnValue({ from: () => query })
  mocks.organizations.mockResolvedValue([stratix, emc])
})

describe('Sales organization context', () => {
  it('requires explicit selection for multiple memberships and renders no organization records', async () => {
    const html = renderToStaticMarkup(await Page())
    expect(html).toContain('Select a Sales organization')
    expect(html).toContain('EMC')
    expect(html).not.toContain('data-testid="native-records"')
    expect(mocks.organizations).toHaveBeenCalledWith(expect.anything(), 'auth-id', 'profile-id')
  })
  it('renders only the explicitly selected authorized organization', async () => {
    const html = renderToStaticMarkup(await Page({ searchParams: { organization: emc.organizationId } }))
    expect(html).toContain(`data-organization-id="${emc.organizationId}"`)
    expect(html).not.toContain(`data-organization-id="${stratix.organizationId}"`)
  })
  it('preserves the single-organization experience and excludes pending organizations', async () => {
    mocks.organizations.mockResolvedValue([stratix])
    const html = renderToStaticMarkup(await Page())
    expect(html).toContain(`data-organization-id="${stratix.organizationId}"`)
    expect(html).not.toContain('EMC')
  })
  it.each(['33333333-3333-4333-8333-333333333333', ['a','b'], ''])
    ('rejects an unauthorized or malformed organization selection', async organization => {
      await expect(Page({ searchParams: { organization } })).rejects.toThrow('NOT_FOUND')
    })
  it('does not expose Sales to a login without an active membership', async () => {
    mocks.organizations.mockResolvedValue([])
    await expect(Page()).rejects.toThrow('NOT_FOUND')
  })
})
