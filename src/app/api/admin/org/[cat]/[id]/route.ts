import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { requireAdmin } from '@/shared/db/requireAdmin'
import { ORG_CATALOGS, isOrgCat, pickFields, dupError } from '@/features/admin/org-catalogs'
import type { OrgRow } from '@/shared/context/loadAppData'

export async function PATCH(req: NextRequest, { params }: { params: { cat: string; id: string } }) {
  const authz = await requireAdmin(); if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  if (!isOrgCat(params.cat)) return NextResponse.json({ error: 'Catálogo desconocido.' }, { status: 404 })

  const row = pickFields(params.cat, (await req.json()) as Partial<OrgRow>)
  // `codigo` NO se re-deriva al renombrar: es la referencia estable de la fila.
  if (row.nombre !== undefined && !row.nombre.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
  }
  if (!Object.keys(row).length) return NextResponse.json({ error: 'Sin campos para actualizar.' }, { status: 400 })

  const { data, error } = await supabaseAdmin().from(params.cat).update(row).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: dupError(error) }, { status: 400 })
  return NextResponse.json({ row: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { cat: string; id: string } }) {
  const authz = await requireAdmin(); if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  if (!isOrgCat(params.cat)) return NextResponse.json({ error: 'Catálogo desconocido.' }, { status: 404 })

  const db = supabaseAdmin()
  // Bloquear + avisar si hay dependientes (aunque usuario_cargos tenga ON DELETE
  // CASCADE: borrar un cargo asignado debe ser una decisión explícita, no un efecto).
  // Una empresa tiene varios dependientes (personas, actividades, solicitudes…):
  // se suman todos para reportar el total en uso.
  // Las FK por clave natural comparan contra `codigo`, no contra el uuid: hay que
  // leer la fila antes para saber qué valor buscar.
  const necesitaCodigo = ORG_CATALOGS[params.cat].blockedBy.some(b => b.matchOn === 'codigo')
  let codigo: string | undefined
  if (necesitaCodigo) {
    const { data, error } = await db.from(params.cat).select('codigo').eq('id', params.id).single()
    // Sin el código no se puede contar por clave natural, y seguir daría un "0 en
    // uso" falso que habilita el borrado: la FK igual lo frenaría, pero con el
    // error crudo de Postgres que este chequeo existe para evitar.
    if (error) return NextResponse.json({ error: 'No se pudo verificar si está en uso. Reintentá.' }, { status: 503 })
    codigo = data?.codigo
  }

  const counts = await Promise.all(ORG_CATALOGS[params.cat].blockedBy.map(({ table, column, matchOn }) =>
    db.from(table).select('*', { count: 'exact', head: true })
      .eq(column, matchOn === 'codigo' ? codigo : params.id),
  ))
  const enUso = counts.reduce((n, r) => n + (r.count || 0), 0)
  if (enUso > 0) {
    return NextResponse.json({ error: `Está en uso por ${enUso} registro(s). Reasignalos antes de borrar.` }, { status: 400 })
  }

  const { error } = await db.from(params.cat).delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
