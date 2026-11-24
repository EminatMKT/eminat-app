/** Fixed, dedicated staging allocation; never inferred from request headers. */
export const STAGING_DB_REF = 'sykxgksagbhmfrzbbtfe'
export const STAGING_PORTAL_ORIGIN = 'https://staging.portal.corazonsalud.health'
export function patientPortalOrigin(env: Record<string,string|undefined> = process.env) {
 return env.NEXT_PUBLIC_APP_ENV === 'staging' ? STAGING_PORTAL_ORIGIN : 'https://portal.corazonsalud.health'
}
export function isSyntheticRecipient(value:string) { return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@example\.invalid$/i.test(value) }
