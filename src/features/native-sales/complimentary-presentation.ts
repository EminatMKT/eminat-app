export type BenefitAction = 'EXTEND' | 'SUSPEND' | 'REVOKE' | 'REACTIVATE'
export function benefitActions(status: string, expiresAt: string | null, now = Date.now()): BenefitAction[] {
  const live = !!expiresAt && Date.parse(expiresAt) > now
  if (status === 'ACTIVE') return live ? ['EXTEND', 'SUSPEND', 'REVOKE'] : ['REVOKE']
  if (status === 'SUSPENDED') return live ? ['REACTIVATE', 'EXTEND', 'REVOKE'] : ['REVOKE']
  return status === 'PENDING' || status === 'EXPIRED' ? ['REVOKE'] : []
}
export function validIssueWindow(method: string, from: string, until: string, contact: string | null, now = Date.now()) {
  const start = Date.parse(from), end = Date.parse(until)
  return Number.isFinite(start) && Number.isFinite(end) && end > start && end > now &&
    (method !== 'ADMIN_DIRECT' || !!contact && start <= now)
}
/** Stored expiry is exclusive: display the last covered instant in the captured timezone. */
export function benefitDate(value: string | null | undefined, locale: string, timezone: string, inclusiveEnd = false, includeTime = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return null
  try { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', ...(includeTime ? { timeStyle: 'short' as const } : {}), timeZone: timezone }).format(new Date(Date.parse(value) - (inclusiveEnd ? 1 : 0))) }
  catch { return null }
}
