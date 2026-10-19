import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { salesQaAllowed } from './qa-gate'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type SalesMapping = {
  annie_principal_id: string
  annie_organization_id: string
  empresa_codigo: string | null
  access_kind: 'company_tenant' | 'external_sales_entitlement'
}

// An approved, active mapping is the LILLY entitlement. The rollout switch is
// default-off; the original per-person QA allowlist remains usable during rollout.
export async function salesEntitlement(lillyUsuarioId: string, supabaseAuthId: string): Promise<SalesMapping | null> {
  if (!uuid.test(lillyUsuarioId) || !uuid.test(supabaseAuthId)) {
    console.warn('SALES_ENTITLEMENT_INVALID_ID')
    return null
  }
  if (process.env.ANNIE_SALES_ENABLED !== 'true' && !salesQaAllowed(lillyUsuarioId, supabaseAuthId)) {
    console.warn('SALES_ENTITLEMENT_ROLLOUT_DENIED')
    return null
  }
  const admin = supabaseAdmin()
  const { data: mapping, error } = await admin.from('annie_sales_user_mappings')
    .select('annie_principal_id,annie_organization_id,empresa_codigo,access_kind')
    .eq('lilly_usuario_id', lillyUsuarioId).eq('supabase_auth_id', supabaseAuthId)
    .eq('status', 'active').maybeSingle()
  if (error) {
    console.warn('SALES_ENTITLEMENT_MAPPING_QUERY_FAILED', error.code)
    return null
  }
  if (!mapping) {
    console.warn('SALES_ENTITLEMENT_MAPPING_MISSING')
    return null
  }
  if (!uuid.test(mapping.annie_principal_id) || !uuid.test(mapping.annie_organization_id)) {
    console.warn('SALES_ENTITLEMENT_MAPPING_INVALID_ID')
    return null
  }
  if (mapping.access_kind === 'company_tenant') {
    if (!mapping.empresa_codigo) return null
    const { data: tenant, error: tenantError } = await admin.from('annie_sales_tenant_mappings')
      .select('annie_organization_id').eq('empresa_codigo', mapping.empresa_codigo)
      .eq('annie_organization_id', mapping.annie_organization_id).eq('status', 'active').maybeSingle()
    if (tenantError || !tenant) return null
  } else if (mapping.access_kind !== 'external_sales_entitlement' || mapping.empresa_codigo !== null) return null
  return mapping as SalesMapping
}
