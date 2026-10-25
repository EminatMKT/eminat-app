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
  default: ({ organizationId, workspaceLabelKey }: { organizationId: string; workspaceLabelKey?: string }) =>
    <div data-testid="native-records" data-organization-id={organizationId}>{workspaceLabelKey}</div>,
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

describe('Sales commercial workspace', () => {
  it('opens the default authorized EMC dashboard immediately despite other corporate memberships', async () => {
    const html = renderToStaticMarkup(await Page())
    expect(html).toContain(`data-organization-id="${emc.organizationId}"`)
    expect(html).toContain('sales.workspace.emc')
    expect(html).not.toContain('Select a Sales organization')
    expect(html).not.toContain('Open organization')
    expect(html).not.toContain('Stratix')
    expect(html).not.toContain('<form')
    expect(mocks.organizations).toHaveBeenCalledWith(expect.anything(), 'auth-id', 'profile-id')
  })
  it('renders only the explicitly selected authorized organization', async () => {
    const html = renderToStaticMarkup(await Page({ searchParams: { organization: emc.organizationId } }))
    expect(html).toContain(`data-organization-id="${emc.organizationId}"`)
    expect(html).not.toContain(`data-organization-id="${stratix.organizationId}"`)
  })
  it('opens directly for an authorized EMC seller without changing their role', async () => {
    mocks.organizations.mockResolvedValue([{ ...emc, role: 'SELLER' }])
    const html = renderToStaticMarkup(await Page())
    expect(html).toContain(`data-organization-id="${emc.organizationId}"`)
  })
  it('does not publish unrelated corporate memberships as commercial workspaces', async () => {
    mocks.organizations.mockResolvedValue([stratix])
    await expect(Page()).rejects.toThrow('NOT_FOUND')
  })
  it('rejects a corporate organization query even for its authorized superadmin', async () => {
    await expect(Page({ searchParams: { organization: stratix.organizationId } })).rejects.toThrow('NOT_FOUND')
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
