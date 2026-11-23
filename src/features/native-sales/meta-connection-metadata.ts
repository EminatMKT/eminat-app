import type {I18nKey} from '@/shared/i18n'
type Asset={id:string;integrationId:string;company_code:string;external_asset_id:string;asset_type:string;
  display_name:string;status:string;webhook_status:string;reported_business_id:string|null;relationship:string}
type Connection={id:string;company_code:string;status:string;granted_permissions:string[];provider_cleanup:string;
  provider_cleanup_error:string|null;grant?:{authorizer_member_id:string;meta_user_id?:string;status:string;authorized_at:string;expires_at:string;app_id:string;checked_at:string|null;health_error:string|null;authorizer_name?:string}}
export type Candidate={id:string;external_id:string;asset_type:string;display_name:string;reported_business_id:string|null;tasks:string[]}
export type Snapshot={companies:{code:string;name:string}[];integrations:Connection[];assets:Asset[];canManage:boolean;metaAvailable:boolean}
export const statusCopy:Record<string,I18nKey>={CONNECTED:'meta.state.connected',ACTIVE:'meta.state.active',READY:'meta.state.ready',REVOKED:'meta.state.revoked',DEGRADED:'meta.state.degraded',EXPIRED:'meta.state.expired',AUTHORIZER_DEPARTED:'meta.state.departed',LOCAL_DISABLED:'meta.state.disabled',DISABLED:'meta.state.disabled',NOT_REQUESTED:'meta.state.notRequested',PENDING:'meta.state.pending',FAILED:'meta.state.failed',CONFIRMED:'meta.state.confirmed',OWNER_ASSERTED:'meta.ownerAsserted',AGENCY_DELEGATED:'meta.agencyDelegated',PROVIDER_UNAVAILABLE:'meta.state.unavailable',ACCESS_REVOKED:'meta.state.revoked',ASSET_ACCESS_REMOVED:'meta.state.assetAccess',PERMISSION_MISSING:'meta.state.permissions'}
// Extracted so finding #5's metaError -> code -> message mapping is unit-testable without a DOM
// (this repo has no jsdom/testing-library; PR #209 review finding #5's client-side coverage gap).
export function resolveMetaErrorCode(raw:string|null):'META_PERMISSION_UNAVAILABLE'|'META_AUTHORIZATION_FAILED'{
 return raw==='META_PERMISSION_UNAVAILABLE'?'META_PERMISSION_UNAVAILABLE':'META_AUTHORIZATION_FAILED'
}
export function metaErrorMessageKey(error:string):I18nKey{
 return error==='META_ASSET_ALREADY_RESERVED'?'meta.assetReserved'
  :error==='META_COMPANY_ACCESS_DENIED'?'meta.companyAccessRequired'
  :error==='META_GRANT_UNAVAILABLE'?'meta.selectionExpired'
  :error==='META_PERMISSION_UNAVAILABLE'?'meta.permissionDeclined'
  :'meta.actionError'
}
