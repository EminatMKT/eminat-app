import { NextRequest, NextResponse } from 'next/server'
import requireAdmin from '@/shared/db/requireAdmin'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { guayaquilBirthdayDate } from '@/features/directorio/server/birthday-email'

type Params = { params: { id: string } }
const fields = 'cumple_mes,cumple_dia,anio_nacimiento,cumple_confirmado'

export async function GET(_request: NextRequest, { params }: Params) {
  const access = await requireAdmin()
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const { data, error } = await supabaseAdmin().from('usuario_perfil_privado')
    .select(fields).eq('usuario_id', params.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'No se pudo cargar el cumpleaños' }, { status: 500 })
  return NextResponse.json(data || { cumple_mes: null, cumple_dia: null, anio_nacimiento: null, cumple_confirmado: false })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const access = await requireAdmin()
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const body = await request.json().catch(() => null)
  const month = body?.cumple_mes
  const day = body?.cumple_dia
  const year = body?.anio_nacimiento
  const confirmed = body?.cumple_confirmado
  const paired = month === null && day === null || Number.isInteger(month) && Number.isInteger(day)
  const maxDay = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  const validMonthDay = month === null && day === null ||
    month >= 1 && month <= 12 && day >= 1 && day <= maxDay[month - 1]
  const [todayYear, todayMonth, todayDay] = guayaquilBirthdayDate().split('-').map(Number)
  const validYear = year === null || Number.isInteger(year) && year >= 1800 && year <= todayYear &&
    (month !== 2 || day !== 29 || new Date(year, 1, 29).getMonth() === 1) &&
    (year < todayYear || month < todayMonth || month === todayMonth && day <= todayDay)
  if (!body || Object.keys(body).some(key => !['cumple_mes', 'cumple_dia', 'anio_nacimiento', 'cumple_confirmado'].includes(key)) ||
      typeof confirmed !== 'boolean' || !paired || !validMonthDay || !validYear ||
      (confirmed && month === null) || (year !== null && month === null)) {
    return NextResponse.json({ error: 'Cumpleaños no válido' }, { status: 400 })
  }
  const db = supabaseAdmin()
  const { data: user } = await db.from('usuarios').select('id').eq('id', params.id).maybeSingle()
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  const payload = { usuario_id: params.id, cumple_mes: month, cumple_dia: day,
    anio_nacimiento: year, cumple_confirmado: confirmed, updated_at: new Date().toISOString() }
  const { error } = await db.from('usuario_perfil_privado').upsert(payload, { onConflict: 'usuario_id' })
  if (error) return NextResponse.json({ error: 'No se pudo guardar el cumpleaños' }, { status: 500 })
  return NextResponse.json(payload)
}
