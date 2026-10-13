import { NextResponse } from 'next/server'
import requireModule from '@/shared/db/requireAccess/requireModule'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import type { Member } from '@/features/directorio/types'

const one = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null

export async function GET() {
  const access = await requireModule('directorio')
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const db = supabaseAdmin()
  const [{ data: users, error }, { data: companies, error: companyError }, { data: roles, error: roleError }] = await Promise.all([
    db.from('usuarios').select('id,auth_id,nombre,apellido,email,rol,color,avatar_key,ubicacion,empresa_id,activo,equipos!usuarios_equipo_id_fkey(departamentos(nombre)),usuario_cargos(cargos(nombre))')
      .eq('activo', true).eq('directorio_visible', true).not('auth_id', 'is', null).order('nombre'),
    db.from('empresas').select('id,nombre,codigo,color'),
    db.from('roles').select('key,label'),
  ])
  if (error || companyError || roleError) return NextResponse.json({ error: 'No se pudo cargar Directory' }, { status: 500 })
  const companyById = new Map((companies || []).map(company => [company.id, company]))
  const roleByKey = new Map((roles || []).map(role => [role.key, role.label]))
  const members: Member[] = (users || []).map(user => {
    const company = companyById.get(user.empresa_id)
    const jobs = user.usuario_cargos?.map(entry => one(entry.cargos)?.nombre).filter(Boolean).join(', ')
    return {
      id: user.id,
      nombre: [user.nombre, user.apellido].filter(Boolean).join(' ').trim(),
      email: user.email || '',
      cargo: jobs || roleByKey.get(user.rol) || '',
      empresa: company?.nombre || '',
      empresaId: company?.id || '',
      departamento: one(one(user.equipos)?.departamentos)?.nombre || '',
      ubicacion: user.ubicacion || '',
      color: user.color || company?.color || '#7C6FF7',
      avatarKey: user.avatar_key || null,
    }
  })
  return NextResponse.json({ members }, { headers: { 'Cache-Control': 'private, no-store' } })
}
