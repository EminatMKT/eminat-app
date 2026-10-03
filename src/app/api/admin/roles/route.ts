import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/server/db'
import requireAdmin from '@/shared/db/requireAdmin'
import { validateModuleSlugs, validateNewRole } from '@/shared/auth/roleValidation'
import type { RoleRow } from '@/shared/auth/permissions'
import { RPCS, TABLES, TABLE_COLUMNS } from '@/shared/schema'
import { roleFailure, ROLE_HTTP } from '@/server/admin/roles'

const { roles } = TABLE_COLUMNS
const ROLE_LIST = [roles.key, roles.label, roles.isSystem].join()

/** Creates a role with its modules. No GET: the context serves the list through `useApp().roles`. */
export async function POST(req: Request) {
  const authz = await requireAdmin()
  const denied = { status: authz.status }
  const denial = { error: authz.error }
  if (!authz.ok) return NextResponse.json(denial, denied)
  const { label, modules = [] } = await req.json()
  const mods = validateModuleSlugs(modules)
  if (mods.ok === false) {
    const badModules = { error: mods.error }
    return NextResponse.json(badModules, ROLE_HTTP.badRequest)
  }
  const db = supabaseAdmin()
  const { data: existing } = await db.from(TABLES.roles).select(ROLE_LIST).overrideTypes<RoleRow[], { merge: false }>()
  const v = validateNewRole(label, existing ?? [])
  if (v.ok === false) {
    const badLabel = { error: v.error }
    return NextResponse.json(badLabel, ROLE_HTTP.badRequest)
  }
  // One transaction: the role and its modules land together or not at all.
  const saveParams = {
    p_key: v.key,
    p_label: label,
    p_modules: modules,
    p_is_new: true,
  }
  const { error } = await db.rpc(RPCS.saveRole, saveParams)
  const created = { key: v.key }
  if (!error) return NextResponse.json(created, ROLE_HTTP.created)
  const { status, error: message } = roleFailure(error)
  const failed = { status }
  const failure = { error: message }
  return NextResponse.json(failure, failed)
}
