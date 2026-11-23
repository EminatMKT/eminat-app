import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import en from '@/shared/i18n/locales/en.json'
import NativeSocialStatus from './NativeSocialStatus'
import type { NativeRequest } from './NativeSalesModule'
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: keyof typeof en) => en[key] }) }))

const request = vi.fn() as unknown as NativeRequest

describe('NativeSocialStatus role gate (PR #209 review finding #6)', () => {
  it.each(['SELLER', 'SALES_MANAGER', 'FINANCE', 'AUDITOR'])(
    'renders only the admin-required notice for a non-qualifying role (%s), never the connections panel',
    role => {
      const html = renderToStaticMarkup(<NativeSocialStatus request={request} role={role} />)
      expect(html).toContain(en['salesNative.socialConnectionSettingsAreAvailableToSalesAdministrators'])
      expect(html).not.toContain(en['meta.integrationTitle'])
    })
  it.each(['SUPERADMIN', 'ADMINISTRATOR'])('renders the connections panel for a qualifying role (%s)', role => {
    const html = renderToStaticMarkup(<NativeSocialStatus request={request} role={role} />)
    expect(html).toContain(en['meta.integrationTitle'])
    expect(html).not.toContain(en['salesNative.socialConnectionSettingsAreAvailableToSalesAdministrators'])
  })
  it('renders the connections panel when no role is supplied (callers that already org-gate server-side)', () => {
    const html = renderToStaticMarkup(<NativeSocialStatus request={request} />)
    expect(html).toContain(en['meta.integrationTitle'])
    expect(html).not.toContain(en['salesNative.socialConnectionSettingsAreAvailableToSalesAdministrators'])
  })
})
