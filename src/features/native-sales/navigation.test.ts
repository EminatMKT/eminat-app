import { describe, expect, it } from 'vitest'
import { salesSection, salesSectionHref, salesSections } from './navigation'

describe('Sales navigation URLs', () => {
  it('gives each unique existing Sales workflow one destination', () => {
    expect(salesSections.map(item => item.key)).toEqual(['dashboard', 'leads', 'portal-leads',
      'contacts', 'accounts', 'opportunities', 'pipeline', 'activities', 'memberships',
      'reports', 'payments', 'social', 'settings'])
    expect(new Set(salesSections.map(item => item.key)).size).toBe(salesSections.length)
  })
  it.each(salesSections)('round-trips $key for deep links, refresh and history', ({ key }) => {
    const url = new URL(salesSectionHref('organization=authorized-org', key), 'https://app.example')
    expect(url.searchParams.get('organization')).toBe('authorized-org')
    expect(salesSection(url.searchParams)).toBe(key)
  })
  it('preserves existing social and QBO callback destinations', () => {
    expect(salesSection(new URLSearchParams('metaState=connected'))).toBe('social')
    expect(salesSection(new URLSearchParams('metaError=denied'))).toBe('social')
    expect(salesSection(new URLSearchParams('qboConnection=connected'))).toBe('settings')
  })
  it('does not trap navigation on a completed callback', () => {
    expect(salesSectionHref('metaState=connected&qboConnection=ok&organization=emc', 'contacts'))
      .toBe('/sales-native?organization=emc&section=contacts')
  })
  it.each(['', 'section=unknown', 'section=../../admin'])('defaults safely for %s', search => {
    expect(salesSection(new URLSearchParams(search))).toBe('dashboard')
  })
})
