import { NextRequest, NextResponse } from 'next/server'
import requireAdmin from '@/shared/db/requireAdmin'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAdmin()
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  if (!uuid.test(params.id)) return NextResponse.json({ error: 'Usuario inválido.' }, { status: 400 })
  const { data, error } = await supabaseAdmin().from('usuario_empresas_acceso')
    .select('empresa_codigo').eq('usuario_id', params.id).order('empresa_codigo')
  if (error) return NextResponse.json({ error: 'No se pudieron cargar los accesos.' }, { status: 500 })
  return NextResponse.json({ codes: (data || []).map(row => row.empresa_codigo) },
    { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAdmin()
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  if (!uuid.test(params.id)) return NextResponse.json({ error: 'Usuario inválido.' }, { status: 400 })
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 }) }
  const codes = (body as { codes?: unknown })?.codes
  if (!Array.isArray(codes) || codes.length > 100 ||
    !codes.every(code => typeof code === 'string' && /^[A-Z0-9_-]{1,40}$/.test(code))) {
    return NextResponse.json({ error: 'Empresas inválidas.' }, { status: 400 })
  }
  const { error } = await supabaseAdmin().rpc('replace_lilly_user_companies', {
    p_user: params.id, p_codes: codes, p_actor: access.userId,
  })
  if (error) return NextResponse.json({ error: 'No se pudieron guardar los accesos.' }, { status: 400 })
  return NextResponse.json({ codes: Array.from(new Set(codes)) },
    { headers: { 'Cache-Control': 'private, no-store' } })
}
