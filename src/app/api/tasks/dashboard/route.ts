import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/shared/db/requireAdmin'
import { ssrClient } from '@/shared/db/requireAccess'

const date = (value: string | null) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
const uuid = (value: string | null) => value && /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(value) ? value : null

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const q = req.nextUrl.searchParams
  const from = date(q.get('from'))
  const to = date(q.get('to'))
  if ((q.has('from') && !from) || (q.has('to') && !to) || (from && to && from > to) ||
      (q.has('user') && !uuid(q.get('user'))) || (q.has('team') && !uuid(q.get('team'))) ||
      (q.has('department') && !uuid(q.get('department')))) {
    return NextResponse.json({ error: 'Período inválido.' }, { status: 400 })
  }
  const { data, error } = await ssrClient().rpc('lilly_task_metrics', {
    p_from: from, p_to: to, p_empresa: q.get('empresa') || null,
    p_user_id: uuid(q.get('user')), p_team_id: uuid(q.get('team')),
    p_department_id: uuid(q.get('department')), p_estado: q.get('estado') || null,
  })
  if (error) return NextResponse.json({ error: 'No se pudieron calcular las métricas.' }, { status: 500 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
}
