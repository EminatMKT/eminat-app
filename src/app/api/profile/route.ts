import { NextRequest, NextResponse } from 'next/server'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
import { isAvatarKey } from '@/shared/components/AvatarArt'

async function ownProfile() {
  const client = ssrClient()
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user) return { client, profile: null, status: 401 }
  const { data: profile, error } = await client.from('usuarios')
    .select('id,avatar_key,nombre,apellido,email,activo')
    .eq('auth_id', user.id).eq('activo', true).maybeSingle()
  return { client, profile: error ? null : profile, status: error ? 500 : 403 }
}

export async function GET() {
  const { client, profile, status } = await ownProfile()
  if (!profile) return NextResponse.json({ error: 'Perfil no disponible' }, { status })
  const { data, error } = await client.from('usuario_perfil_privado')
    .select('fecha_nacimiento').eq('usuario_id', profile.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'No se pudo cargar el perfil' }, { status: 500 })
  return NextResponse.json({ profile: { ...profile, fecha_nacimiento: data?.fecha_nacimiento ?? null } })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || Object.keys(body).length !== 1 || !isAvatarKey(body.avatar_key)) {
    return NextResponse.json({ error: 'Avatar no válido' }, { status: 400 })
  }
  const { client, profile, status } = await ownProfile()
  if (!profile) return NextResponse.json({ error: 'Perfil no disponible' }, { status })
  const { data, error } = await client.from('usuarios')
    .update({ avatar_key: body.avatar_key })
    .eq('id', profile.id).eq('auth_id', (await client.auth.getUser()).data.user?.id)
    .select('id,avatar_key').maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'No se pudo guardar el avatar' }, { status: 500 })
  return NextResponse.json({ profile: data })
}
