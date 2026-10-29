/** Verified EMC assets only. This is a server policy, never browser input.
 * The matching SQL guard is exercised in native-sales-social-rehearsal.sql. */
export const EMC_META_LEAD_POLICY = {
  organizationId: '9efab353-46a0-43d1-9901-e3f185dc5d30',
  businessId: '1865633431087642',
  appId: '919434760646769',
  pageId: '405695562628937',
  formIds: ['612660371798285'],
  excludedFormIds: ['1382279963288694', '3854753151408361'],
} as const

export function approvedMetaLead(pageId: unknown, formId: unknown): boolean {
  return pageId === EMC_META_LEAD_POLICY.pageId &&
    EMC_META_LEAD_POLICY.formIds.some(id => id === formId)
}

/** No free-text inquiry, insurance, DOB, ZIP, medical answers or company fields. */
export function allowMetaLeadFields(fields: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const name of ['first_name', 'last_name', 'full_name'] as const) {
    const value = fields[name]?.trim()
    if (value && value.length <= 200 && !/[\r\n<>]/.test(value)) result[name] = value
  }
  const email = fields.email?.trim().toLowerCase()
  if (email && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) result.email = email
  const phone = fields.phone_number?.replace(/[ ()\-.]/g, '')
  if (phone && /^\+?[0-9]{7,15}$/.test(phone)) result.phone_number = phone
  const language = fields.preferred_language?.trim().toLowerCase()
  if (language && ['en', 'es', 'english', 'spanish', 'inglés', 'español'].includes(language))
    result.preferred_language = ['es', 'spanish', 'español'].includes(language) ? 'es' : 'en'
  return result
}
