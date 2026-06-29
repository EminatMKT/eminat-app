import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { requireAdmin } from '@/shared/db/requireAdmin'
import { validateModuleSlugs } from '@/shared/auth/roleValidation'

export async function PATCH(req: NextRequest, { params }: { params: { key: string } }) {
  const authz = await requireAdmin(); if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  const { label, modules } = await req.json()
  const db = supabaseAdmin()
  // Roles is_system (admin/sin_asignar): se puede renombrar el label, NO editar módulos
  // (admin = short-circuit sin filas; sin_asignar = baseline sin módulos). Evita data rot.
  const { data: roleRow } = await db.from('roles').select('is_system').eq('key', params.key).maybeSingle()
  if (label !== undefined) {
    const { error } = await db.from('roles').update({ label: String(label).trim() }).eq('key', params.key)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (Array.isArray(modules)) {
    if (roleRow?.is_system) return NextResponse.json({ error: 'No se pueden editar los módulos de un rol del sistema.' }, { status: 400 })
    const v = validateModuleSlugs(modules); if (!v.ok) return NextResponse.json({ error: (v as { error: string }).error }, { status: 400 })
    await db.from('role_modules').delete().eq('role_key', params.key)
    if (modules.length) await db.from('role_modules').insert(modules.map((m: string) => ({ role_key: params.key, module_slug: m })))
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { key: string } }) {
  const authz = await requireAdmin(); if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  const db = supabaseAdmin()
  const { data: role } = await db.from('roles').select('is_system').eq('key', params.key).maybeSingle()
  if (role?.is_system) return NextResponse.json({ error: 'No se puede borrar un rol del sistema.' }, { status: 400 })
  const { count } = await db.from('usuarios').select('id', { count: 'exact', head: true }).eq('rol', params.key)
  if (count && count > 0) return NextResponse.json({ error: `El rol tiene ${count} usuario(s). Reasignalos antes de borrar.` }, { status: 400 })
  const { error } = await db.from('roles').delete().eq('key', params.key)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
