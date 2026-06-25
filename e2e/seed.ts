// Helpers de seed para E2E contra la Supabase LOCAL (GoTrue admin + service_role).
// Idempotentes: se pueden correr en cada global-setup sin romper.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
export const PASSWORD = 'eminat123'

const H = { 'Content-Type': 'application/json', apikey: SERVICE, Authorization: `Bearer ${SERVICE}` }

export async function authIdByEmail(email: string): Promise<string | null> {
  const r = await fetch(`${URL}/auth/v1/admin/users?per_page=200`, { headers: H })
  const j = await r.json()
  const u = (j.users || []).find((x: any) => x.email === email)
  return u?.id ?? null
}

// Crea (o reutiliza) el auth user y deja la fila usuarios con el rol pedido. service_role
// bypassa el trigger prevent_rol_self_change, así que el UPDATE de rol pasa.
export async function ensureUser(email: string, rol: string, nombre = 'Test', apellido = 'User') {
  let auth_id = await authIdByEmail(email)
  if (!auth_id) {
    const r = await fetch(`${URL}/auth/v1/admin/users`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
    })
    const j = await r.json()
    auth_id = j.id ?? (await authIdByEmail(email))
  }
  const ri = await fetch(`${URL}/rest/v1/usuarios?on_conflict=email`, {
    method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ email, nombre, apellido, rol, auth_id, validado: true, activo: true }),
  })
  if (!ri.ok) throw new Error(`ensureUser ${email}: ${ri.status} ${await ri.text()}`)
  return auth_id
}

// Borra el usuario (fila usuarios + auth user). Idempotente: usado en global-setup
// para limpiar el usuario que crea el test de alta entre corridas.
export async function deleteUser(email: string) {
  await fetch(`${URL}/rest/v1/usuarios?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE', headers: H })
  const id = await authIdByEmail(email)
  if (id) await fetch(`${URL}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: H })
}

export async function setRol(email: string, rol: string) {
  const r = await fetch(`${URL}/rest/v1/usuarios?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ rol }),
  })
  if (!r.ok) throw new Error(`setRol ${email}: ${r.status} ${await r.text()}`)
}

export async function getUsuario(email: string): Promise<any | null> {
  const r = await fetch(`${URL}/rest/v1/usuarios?email=eq.${encodeURIComponent(email)}&select=id,email,rol,activo`, { headers: H })
  const j = await r.json()
  return j[0] ?? null
}

// Borra un rol dinámico (y sus role_modules). FK RESTRICT: los usuarios que lo tengan
// deben moverse antes. Se usa para limpiar 'soporte' entre corridas.
export async function deleteRole(key: string) {
  await fetch(`${URL}/rest/v1/role_modules?role_key=eq.${key}`, { method: 'DELETE', headers: H })
  await fetch(`${URL}/rest/v1/roles?key=eq.${key}`, { method: 'DELETE', headers: H })
}
