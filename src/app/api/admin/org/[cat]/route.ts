import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
import { requireAdmin } from '@/shared/db/requireAdmin'
import { ORG_CATALOGS, isOrgCat, codigoFrom, pickFields, dupError } from '@/features/admin/org-catalogs'
import type { OrgRow } from '@/shared/context/loadAppData'

// Sin GET: las listas las sirve el contexto (useApp().departamentos/equipos/cargos).
// Acá solo mutaciones, igual que /api/admin/roles. `cat` viene de la whitelist
// ORG_CATALOGS — nunca del body — así el nombre de tabla no es inyectable.
export async function POST(req: NextRequest, { params }: { params: { cat: string } }) {
  const authz = await requireAdmin(); if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  if (!isOrgCat(params.cat)) return NextResponse.json({ error: 'Catálogo desconocido.' }, { status: 404 })

  const row = pickFields(params.cat, (await req.json()) as Partial<OrgRow>)
  const nombre = (row.nombre ?? '').trim()
  if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
  for (const f of ORG_CATALOGS[params.cat].fields) {
    if (f.required && !row[f.name]) return NextResponse.json({ error: `Falta un campo obligatorio: ${f.name}.` }, { status: 400 })
  }

  // `codigo` solo es editable donde el catálogo lo declara como campo (empresas:
  // se muestra como chip). En el resto se deriva del nombre.
  const { data, error } = await supabaseAdmin()
    .from(params.cat).insert({ ...row, nombre, codigo: row.codigo?.trim() || codigoFrom(nombre) }).select().single()
  if (error) return NextResponse.json({ error: dupError(error) }, { status: 400 })
  return NextResponse.json({ row: data }, { status: 201 })
}
