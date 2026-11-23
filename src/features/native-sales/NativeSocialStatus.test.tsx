import React from 'react'
import type { EffectCallback } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import en from '@/shared/i18n/locales/en.json'
import NativeSocialStatus from './NativeSocialStatus'
import { metaErrorMessageKey, resolveMetaErrorCode } from './meta-connection-metadata'
import type { NativeRequest } from './NativeSalesModule'
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: keyof typeof en) => en[key] }) }))
// Collects effect callbacks instead of running them (renderToStaticMarkup never runs effects on
// its own) so a test can invoke a specific one manually, the same technique used by
// src/shared/i18n/context/Provider/index.test.tsx — this repo has no jsdom/testing-library.
const effects = vi.hoisted(() => ({ callbacks: Array<EffectCallback>() }))
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, useEffect: (callback: EffectCallback) => effects.callbacks.push(callback) }
})
afterEach(() => { effects.callbacks = [] })

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
  // The tests above only prove the notice renders; they never prove the privileged fetch was
  // actually skipped (removing the guard inside the effect would still pass them). These run the
  // real first effect (the one that calls `request('social/connections')`) via the captured
  // callback to observe that directly.
  it('never calls request for a non-qualifying role, not just hides the panel after fetching', () => {
    const scopedRequest = vi.fn() as unknown as NativeRequest
    renderToStaticMarkup(<NativeSocialStatus request={scopedRequest} role="SELLER" />)
    expect(effects.callbacks).toHaveLength(2) // both useEffect calls always register; only their bodies are gated
    effects.callbacks[0]()
    expect(scopedRequest).not.toHaveBeenCalled()
  })
  it('does call request for a qualifying role', () => {
    const scopedRequest = vi.fn().mockResolvedValue({ data: {} }) as unknown as NativeRequest
    renderToStaticMarkup(<NativeSocialStatus request={scopedRequest} role="ADMINISTRATOR" />)
    expect(effects.callbacks).toHaveLength(2)
    effects.callbacks[0]()
    expect(scopedRequest).toHaveBeenCalledWith('social/connections')
  })
})

describe('metaError -> message mapping (PR #209 review finding #5, client half)', () => {
  it('reads META_PERMISSION_UNAVAILABLE through, but collapses every other value to the generic code', () => {
    expect(resolveMetaErrorCode('META_PERMISSION_UNAVAILABLE')).toBe('META_PERMISSION_UNAVAILABLE')
    expect(resolveMetaErrorCode('access_denied')).toBe('META_AUTHORIZATION_FAILED')
    expect(resolveMetaErrorCode(null)).toBe('META_AUTHORIZATION_FAILED')
  })
  it('maps the permission-declined code to its own distinct message, not the generic one', () => {
    expect(metaErrorMessageKey('META_PERMISSION_UNAVAILABLE')).toBe('meta.permissionDeclined')
    expect(metaErrorMessageKey('META_AUTHORIZATION_FAILED')).toBe('meta.actionError')
    expect(metaErrorMessageKey('META_PERMISSION_UNAVAILABLE')).not.toBe(metaErrorMessageKey('META_AUTHORIZATION_FAILED'))
  })
})
