import 'server-only'
import { z } from 'zod'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { NativeSalesAuthError } from '../auth'
import type { SalesActor } from '../policy'
import { canManageMeta } from './connection-policy'

export const companyOnboardingInput = z.object({
  companyCode: z.string().trim().min(1).max(100),
  active: z.boolean(),
  relationship: z.enum(['OWNER_ASSERTED', 'AGENCY_DELEGATED']).nullable(),
  acknowledged: z.literal(true),
}).strict().refine(value => !value.active || value.relationship !== null)

function authorize(actor: SalesActor) {
  if (!canManageMeta(actor)) throw new NativeSalesAuthError(403, 'SALES_ACCESS_DENIED')
}
function databaseError(error: { code?: string } | null) {
  if (!error) return
  if (error.code === '42501') throw new NativeSalesAuthError(403, 'META_COMPANY_ACCESS_DENIED')
  if (error.code === '22023') throw new NativeSalesAuthError(422, 'META_COMPANY_INVALID')
  throw new NativeSalesAuthError(503, 'META_COMPANY_UNAVAILABLE')
}
/** This only enables an already assigned company. It never grants company access,
 * creates tenants/users, transfers assets, or contacts Meta. SQL repeats authorization. */
export async function listMetaCompanies(actor: SalesActor) {
  authorize(actor)
  const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_meta_onboarding_companies', {
    p_org: actor.organizationId, p_member: actor.memberId,
  })
  databaseError(error)
  return data
}
export async function manageMetaCompany(actor: SalesActor, input: unknown) {
  authorize(actor)
  const parsed = companyOnboardingInput.safeParse(input)
  if (!parsed.success) throw new NativeSalesAuthError(422, 'META_COMPANY_INVALID')
  const { companyCode, active, relationship } = parsed.data
  const { data, error } = await supabaseAdmin({ noStore: true }).rpc('native_meta_manage_company', {
    p_org: actor.organizationId, p_member: actor.memberId, p_company: companyCode,
    p_active: active, p_relationship: relationship,
  })
  databaseError(error)
  return data
}
