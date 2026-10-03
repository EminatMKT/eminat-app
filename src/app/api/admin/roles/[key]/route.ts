import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import requireAdmin from '@/shared/db/requireAdmin'
import validateModuleSlugs from '@/shared/auth/roleValidation/validateModuleSlugs'
import { RPCS, TABLES, TABLE_COLUMNS } from '@/shared/schema'
import roleFailure from '../_shared/role-failure'
import ROLE_HTTP from '../_shared/role-http'

const { roles, usuarios } = TABLE_COLUMNS
const SYSTEM_ROLE_DELETE = 'A system role cannot be deleted.'
const ROLE_IN_USE = 'The role still has users. Reassign them before deleting it.'
type RouteContext = { params: Record<'key', string> }

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authz = await requireAdmin()
  const denied = { status: authz.status }
  if (!authz.ok) return NextResponse.json({ error: authz.error }, denied)
  const { label, modules } = await req.json()
  const replacesModules = Array.isArray(modules)
  const v = replacesModules ? validateModuleSlugs(modules) : null
  if (v && !v.ok) return NextResponse.json({ error: (v as { error: string }).error }, ROLE_HTTP.badRequest)
  // One transaction, row-locked: a system role keeps its label editable and its modules frozen,
  // and two admins editing one role apply one after the other.
  const saveParams = {
    p_key: params.key,
    p_label: label === undefined ? null : String(label),
    p_modules: replacesModules ? modules : null,
    p_is_new: false,
  }
  const { error } = await supabaseAdmin().rpc(RPCS.saveRole, saveParams)
  if (!error) return NextResponse.json({ ok: true })
  const { status, error: message } = roleFailure(error)
  const failed = { status }
  return NextResponse.json({ error: message }, failed)
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const authz = await requireAdmin()
  const denied = { status: authz.status }
  if (!authz.ok) return NextResponse.json({ error: authz.error }, denied)
  const db = supabaseAdmin()
  const { data: role } = await db.from(TABLES.roles).select(roles.isSystem).eq(roles.key, params.key).maybeSingle()
  if (role?.is_system) return NextResponse.json({ error: SYSTEM_ROLE_DELETE }, ROLE_HTTP.badRequest)
  const { count } = await db.from(TABLES.usuarios).select(usuarios.id, ROLE_HTTP.countOnly).eq(usuarios.rol, params.key)
  if (count && count > 0) return NextResponse.json({ error: ROLE_IN_USE }, ROLE_HTTP.badRequest)
  const { error } = await db.from(TABLES.roles).delete().eq(roles.key, params.key)
  if (error) return NextResponse.json({ error: error.message }, ROLE_HTTP.badRequest)
  return NextResponse.json({ ok: true })
}
