import { recordPrivilegedAction } from '@/server/privileged-audit'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/server/db'
import requireAdmin from '@/shared/db/requireAdmin'
import { validateModuleSlugs } from '@/shared/auth/roleValidation'
import { RPCS, TABLES, TABLE_COLUMNS } from '@/shared/schema'
import { roleFailure, ROLE_HTTP } from '@/server/admin/roles'

const { roles, usuarios } = TABLE_COLUMNS
const { done: DONE, systemRoleDelete: SYSTEM_ROLE_DELETE, roleInUse: ROLE_IN_USE } = ROLE_HTTP
type RouteContext = { params: Record<'key', string> }

export async function PATCH(req: Request, { params }: RouteContext) {
  const authz = await requireAdmin()
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  const { label, modules } = await req.json()
  const v = Array.isArray(modules) ? validateModuleSlugs(modules) : null
  if (v?.ok === false) {
    const badModules = { error: v.error }
    return NextResponse.json(badModules, ROLE_HTTP.badRequest)
  }
  // One transaction, row-locked: a system role keeps its label editable and its modules frozen,
  // and two admins editing one role apply one after the other.
  const saveParams = {
    p_key: params.key,
    p_label: label === undefined ? null : String(label),
    p_modules: v ? modules : null,
    p_is_new: false,
  }
  const db = supabaseAdmin()
  const { error } = await db.rpc(RPCS.saveRole, saveParams)
  if (!error) {
    await recordPrivilegedAction(db, { action: 'admin.role.updated', actorId: authz.userId,
      roleKey: params.key, changedFields: [...(label !== undefined ? ['label'] : []), ...(v ? ['modules'] : [])] })
    return NextResponse.json(DONE)
  }
  const { status, ...failure } = roleFailure(error)
  const failed = { status }
  return NextResponse.json(failure, failed)
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const authz = await requireAdmin()
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  const db = supabaseAdmin()
  const { data: role } = await db.from(TABLES.roles).select(roles.isSystem).eq(roles.key, params.key).maybeSingle()
  if (role?.is_system) return NextResponse.json(SYSTEM_ROLE_DELETE, ROLE_HTTP.badRequest)
  const { count } = await db.from(TABLES.usuarios).select(usuarios.id, ROLE_HTTP.countOnly).eq(usuarios.rol, params.key)
  if (count && count > 0) return NextResponse.json(ROLE_IN_USE, ROLE_HTTP.badRequest)
  const { error } = await db.from(TABLES.roles).delete().eq(roles.key, params.key)
  if (!error) {
    await recordPrivilegedAction(db, { action: 'admin.role.deleted', actorId: authz.userId, roleKey: params.key })
    return NextResponse.json(DONE)
  }
  const failure = { error: error.message }
  return NextResponse.json(failure, ROLE_HTTP.badRequest)
}
