import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { requireAdmin } from '@/shared/db/requireAdmin'
import { validateNewRole, validateModuleSlugs } from '@/shared/auth/roleValidation'
import type { RoleRow } from '@/shared/auth/permissions'

// Sin GET: la lista la sirve el contexto (useApp().roles). Acá solo mutaciones.
export async function POST(req: NextRequest) {
  const authz = await requireAdmin(); if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  const { label, modules = [] } = await req.json()
  const mods = validateModuleSlugs(modules); if (!mods.ok) return NextResponse.json({ error: (mods as { error: string }).error }, { status: 400 })
  const db = supabaseAdmin()
  const { data: existing } = await db.from('roles').select('key,label,is_system')
  const v = validateNewRole(label, (existing as RoleRow[]) || []); if (!v.ok) return NextResponse.json({ error: (v as { error: string }).error }, { status: 400 })
  const { error: e1 } = await db.from('roles').insert({ key: v.key, label: label.trim(), is_system: false })
  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 })
  if (modules.length) {
    const { error: e2 } = await db.from('role_modules').insert(modules.map((m: string) => ({ role_key: v.key, module_slug: m })))
    if (e2) return NextResponse.json({ error: e2.message }, { status: 400 })
  }
  return NextResponse.json({ key: v.key }, { status: 201 })
}
