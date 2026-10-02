import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { requireAdmin } from '@/shared/db/requireAdmin'
import { validateNewRole, validateModuleSlugs } from '@/shared/auth/roleValidation'
import type { RoleRow } from '@/shared/auth/permissions'
import { RPCS, TABLES, TABLE_COLUMNS } from '@/shared/schema'
import roleFailure from './_shared/role-failure'
import ROLE_HTTP from './_shared/role-http'

const { roles } = TABLE_COLUMNS
const ROLE_LIST = [roles.key, roles.label, roles.isSystem].join()

// No GET: the list is served by the context (useApp().roles). Only mutations here.
export async function POST(req: NextRequest) {
  const authz = await requireAdmin()
  const denied = { status: authz.status }
  if (!authz.ok) return NextResponse.json({ error: authz.error }, denied)
  const { label, modules = [] } = await req.json()
  const mods = validateModuleSlugs(modules)
  if (!mods.ok) return NextResponse.json({ error: (mods as { error: string }).error }, ROLE_HTTP.badRequest)
  const db = supabaseAdmin()
  const { data: existing } = await db.from(TABLES.roles).select(ROLE_LIST).overrideTypes<RoleRow[], { merge: false }>()
  const v = validateNewRole(label, existing ?? [])
  if (!v.ok) return NextResponse.json({ error: (v as { error: string }).error }, ROLE_HTTP.badRequest)
  // One transaction: the role and its modules land together or not at all.
  const saveParams = {
    p_key: v.key,
    p_label: label,
    p_modules: modules,
    p_is_new: true,
  }
  const { error } = await db.rpc(RPCS.saveRole, saveParams)
  if (!error) return NextResponse.json({ key: v.key }, ROLE_HTTP.created)
  const { status, error: message } = roleFailure(error)
  const failed = { status }
  return NextResponse.json({ error: message }, failed)
}
