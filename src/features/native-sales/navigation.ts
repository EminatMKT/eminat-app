import type { I18nKey } from '@/shared/i18n'

export const salesSections = [
  { key: 'dashboard', labelKey: 'salesNative.tabDashboard' },
  { key: 'leads', labelKey: 'salesNative.tabLeads' },
  { key: 'portal-leads', labelKey: 'sales.navigation.portalLeads' },
  { key: 'contacts', labelKey: 'salesNative.tabContacts' },
  { key: 'accounts', labelKey: 'salesNative.tabAccounts' },
  { key: 'opportunities', labelKey: 'salesNative.tabOpportunities' },
  { key: 'pipeline', labelKey: 'salesNative.tabPipeline' },
  { key: 'activities', labelKey: 'salesNative.tabActivities' },
  { key: 'memberships', labelKey: 'salesNative.tabMemberships' },
  { key: 'reports', labelKey: 'salesNative.tabReports' },
  { key: 'payments', labelKey: 'salesNative.tabPayments' },
  { key: 'social', labelKey: 'salesNative.tabSocial' },
  { key: 'settings', labelKey: 'salesNative.tabSettings' },
] as const satisfies readonly { key: string; labelKey: I18nKey }[]
export type SalesSection = typeof salesSections[number]['key']

export function salesSection(params: Pick<URLSearchParams, 'get' | 'has'>): SalesSection {
  const section = params.get('section')
  if (salesSections.some(item => item.key === section)) return section as SalesSection
  if (params.has('qboConnection')) return 'settings'
  if (params.has('metaState') || params.has('metaError')) return 'social'
  return 'dashboard'
}

export function salesSectionHref(search: string, section: SalesSection) {
  const params = new URLSearchParams(search)
  for (const key of ['metaState', 'metaError', 'qboConnection']) params.delete(key)
  params.set('section', section)
  return `/sales-native?${params}`
}
