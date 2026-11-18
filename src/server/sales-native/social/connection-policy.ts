import { z } from 'zod'
import { salesCan, type SalesActor } from '../policy'

export const connectionInput = z.object({ companyCode: z.string().min(1).max(100),
  reconnectIntegrationId: z.uuid().optional(), includeInstagram: z.boolean().default(false) }).strict()
export const selectionInput = z.object({ state: z.string().regex(/^[A-Za-z0-9_-]{40,100}$/),
  assetIds: z.array(z.uuid()).min(1).max(100).refine(ids => new Set(ids).size === ids.length),
  relationship: z.enum(['OWNER_ASSERTED', 'AGENCY_DELEGATED']) }).strict()
export const disconnectInput = z.object({ integrationId: z.uuid() }).strict()
export function canManageMeta(actor: SalesActor) { return salesCan(actor, 'sales:social:manage') }
export function metaReturnPath(organizationId: string, company: string) {
  return `/sales-native/integrations/meta?${new URLSearchParams({ organization: organizationId, company })}`
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
