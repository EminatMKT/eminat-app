import { z } from 'zod'
import { salesCan, type SalesActor } from '../policy'

export const connectionInput = z.object({ companyCode: z.string().min(1).max(100),
  reconnectIntegrationId: z.uuid().optional(), includeInstagram: z.boolean().default(false) }).strict()
export const selectionInput = z.object({ state: z.string().regex(/^[A-Za-z0-9_-]{40,100}$/),
  assetIds: z.array(z.uuid()).min(1).max(100).refine(ids => new Set(ids).size === ids.length),
  relationship: z.enum(['OWNER_ASSERTED', 'AGENCY_DELEGATED']) }).strict()
export const disconnectInput = z.object({ integrationId: z.uuid() }).strict()
export function canManageMeta(actor: SalesActor) { return salesCan(actor, 'sales:social:manage') }
export const DEFAULT_META_RETURN_PATH = '/sales-native/integrations/meta'
export const KNOWN_META_RETURN_PATHS: readonly string[] = [DEFAULT_META_RETURN_PATH, '/settings/integrations/meta']
/** basePath is validated against a fixed allowlist, never trusted verbatim: whatever comes
 * in (a stored value, or ultimately a client-controlled Referer) can only ever select one
 * of the two known local destinations, never redirect anywhere else (PR #209 review,
 * finding #2). The OAuth callback route must validate against this same allowlist, not a
 * single hardcoded path, or a connection started from Settings 400s on return. */
export function metaReturnPath(organizationId: string, company: string, basePath?: string | null) {
  const path = basePath && KNOWN_META_RETURN_PATHS.includes(basePath) ? basePath : DEFAULT_META_RETURN_PATH
  return `${path}?${new URLSearchParams({ organization: organizationId, company })}`
}
/** Derives which entry point (central Settings vs. the legacy Sales-native page) a
 * connection was started from, from the request's own Referer header. Referer is
 * client-controlled, like any header — safety here comes entirely from validating the
 * result against the fixed allowlist above, not from the header's origin (PR #209 review,
 * finding #2). */
export function resolveMetaEntryPath(request?: Request): string {
  const referer = request?.headers.get('referer')
  if (!referer) return DEFAULT_META_RETURN_PATH
  try {
    const { pathname } = new URL(referer)
    return KNOWN_META_RETURN_PATHS.includes(pathname) ? pathname : DEFAULT_META_RETURN_PATH
  } catch { return DEFAULT_META_RETURN_PATH }
}
export type MetaCleanupState = 'NOT_REQUESTED' | 'PENDING' | 'FAILED' | 'CONFIRMED'
/** A plan only: never executes Graph requests or claims provider confirmation. Revoking
 * /me/permissions may affect other authorizers' connections for the same app principal. */
export function prepareMetaDisconnect(externalIds: readonly string[], providerState: MetaCleanupState) {
  return { localDisabled: true, providerConfirmed: providerState === 'CONFIRMED',
    providerState, manualReviewRequired: providerState !== 'CONFIRMED',
    operations: externalIds.map(externalAssetId => ({ operation: 'REVIEW_UNSUBSCRIBE' as const, externalAssetId })),
    grantRevocation: 'REVIEW_SHARED_APP_PRINCIPAL' as const }
}
