import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { clientEnv } from '@/lib/env.client'
import { serverEnv } from '@/lib/env.server'

const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = clientEnv
const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv

const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// GET — List campaigns
export async function GET() {
  const { data, error } = await supabase
    .from('research_campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — Create campaign
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, asunto, contenido, tipo, estado, total_enviados, creado_por } = body

    const { data, error } = await supabase
      .from('research_campaigns')
      .insert([{
        nombre,
        asunto,
        contenido,
        tipo: tipo || 'Email',
        estado: estado || 'Borrador',
        total_enviados: total_enviados || 0,
        creado_por,
      }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT — Update campaign
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 })

    const { data, error } = await supabase
      .from('research_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — Delete campaign
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 })

    const { error } = await supabase
      .from('research_campaigns')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
