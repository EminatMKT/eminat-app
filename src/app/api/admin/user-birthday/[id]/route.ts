import { NextRequest, NextResponse } from 'next/server'
import requireAdmin from '@/shared/db/requireAdmin'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

type Params = { params: { id: string } }

export async function GET(_request: NextRequest, { params }: Params) {
  const access = await requireAdmin()
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const { data, error } = await supabaseAdmin().from('usuario_perfil_privado')
    .select('fecha_nacimiento').eq('usuario_id', params.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'No se pudo cargar la fecha' }, { status: 500 })
  return NextResponse.json({ fecha_nacimiento: data?.fecha_nacimiento ?? null })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const access = await requireAdmin()
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const body = await request.json().catch(() => null)
  const date = body?.fecha_nacimiento
  const parsed = typeof date === 'string' ? new Date(`${date}T00:00:00Z`) : null
  const validDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    parsed !== null && !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date && date <= new Date().toISOString().slice(0, 10)
  if (date !== null && !validDate) {
    return NextResponse.json({ error: 'Fecha no válida' }, { status: 400 })
  }
  const db = supabaseAdmin()
  const { data: user } = await db.from('usuarios').select('id').eq('id', params.id).maybeSingle()
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  const { error } = await db.from('usuario_perfil_privado').upsert({
    usuario_id: params.id, fecha_nacimiento: date, updated_at: new Date().toISOString(),
  }, { onConflict: 'usuario_id' })
  if (error) return NextResponse.json({ error: 'No se pudo guardar la fecha' }, { status: 500 })
  return NextResponse.json({ fecha_nacimiento: date })
}
