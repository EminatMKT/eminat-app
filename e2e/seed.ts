// Helpers de seed para E2E contra la Supabase LOCAL (GoTrue admin + service_role).
// Idempotentes: se pueden correr en cada global-setup sin romper.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE = process.env.SUPABASE_SECRET_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
export const PASSWORD = 'eminat123'

export const H = { 'Content-Type': 'application/json', apikey: SERVICE, Authorization: `Bearer ${SERVICE}` }

export async function authIdByEmail(email: string): Promise<string | null> {
  const r = await fetch(`${URL}/auth/v1/admin/users?per_page=200`, { headers: H })
  const j = await r.json()
  const u = (j.users || []).find((x: any) => x.email === email)
  return u?.id ?? null
}

/** Crea o reconfirma el auth user, SIN fila en `usuarios`. Es la sesión del forastero. */
export async function ensureAuthUser(email: string): Promise<string> {
  let auth_id = await authIdByEmail(email)
  if (!auth_id) {
    const r = await fetch(`${URL}/auth/v1/admin/users`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
    })
    const j = await r.json()
    auth_id = j.id ?? (await authIdByEmail(email))
  } else {
    // Idempotencia real: un user que persiste de corridas previas puede tener otra
    // password. La reseteamos (y reconfirmamos) para que el login E2E sea estable.
    await fetch(`${URL}/auth/v1/admin/users/${auth_id}`, {
      method: 'PUT', headers: H,
      body: JSON.stringify({ password: PASSWORD, email_confirm: true }),
    })
  }
  if (!auth_id) throw new Error(`ensureAuthUser ${email}: no se pudo crear el auth user`)
  return auth_id
}

/** Crea o reutiliza el auth user y deja la fila `usuarios` con el rol pedido. */
export async function ensureUser(email: string, rol: string, nombre = 'Test', apellido = 'User') {
  const auth_id = await ensureAuthUser(email)
  // service_role bypassa prevent_rol_self_change, así que el UPDATE de rol pasa.
  const ri = await fetch(`${URL}/rest/v1/usuarios?on_conflict=email`, {
    method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ email, nombre, apellido, rol, auth_id, validado: true, activo: true }),
  })
  if (!ri.ok) throw new Error(`ensureUser ${email}: ${ri.status} ${await ri.text()}`)
  return auth_id
}

// Tablas con FK usuario_id → usuarios.id que un usuario de test genera al loguear
// (heartbeat, auditoría, notifs). Se limpian antes de borrar la fila: el FK es
// RESTRICT y si no, el DELETE de usuarios falla con 409.
const CHILD_TABLES = ['marcaciones', 'historial', 'notificaciones', 'slots_calendario']

// Borra el usuario (hijos + fila usuarios + auth user). Idempotente: usado en
// global-setup/teardown para limpiar los usuarios que crean los tests.
export async function deleteUser(email: string) {
  const row = await getUsuario(email)
  if (row?.id) {
    for (const tbl of CHILD_TABLES) {
      await fetch(`${URL}/rest/v1/${tbl}?usuario_id=eq.${row.id}`, { method: 'DELETE', headers: H })
    }
  }
  await fetch(`${URL}/rest/v1/usuarios?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE', headers: H })
  const authId = await authIdByEmail(email)
  if (authId) await fetch(`${URL}/auth/v1/admin/users/${authId}`, { method: 'DELETE', headers: H })
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

// Da un módulo a un rol sólo si no lo tenía ya, y devuelve si ya lo tenía. Un spec que necesita
// un reparto que local no tiene (por el drift con prod) lo pide acá y lo revierte con
// `restoreRoleModule`, en vez de dejarlo puesto para la próxima corrida.
export async function ensureRoleModule(role_key: string, module_slug: string): Promise<boolean> {
  const q = `role_key=eq.${role_key}&module_slug=eq.${module_slug}`
  const already = ((await (await fetch(`${URL}/rest/v1/role_modules?${q}`, { headers: H })).json()) as unknown[]).length > 0
  if (!already) {
    await fetch(`${URL}/rest/v1/role_modules`, {
      method: 'POST', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({ role_key, module_slug }),
    })
  }
  return already
}

// El otro lado de `ensureRoleModule`: sólo saca la fila si `hadIt` es false, es decir, si la
// dimos nosotros. Si el rol ya la tenía antes de la corrida, no le tocamos nada.
export async function restoreRoleModule(role_key: string, module_slug: string, hadIt: boolean) {
  if (!hadIt) {
    await fetch(`${URL}/rest/v1/role_modules?role_key=eq.${role_key}&module_slug=eq.${module_slug}`, { method: 'DELETE', headers: H })
  }
}

// Una reunión mínima con `created_by` en el creador dado, para que `creo_la_reunion()` la
// reconozca sin tener que armar la mesa de participantes (`reunion_participantes` es otro andamiaje
// que el gate real —`tema_para_acta()`— no necesita para el creador). `estado` por defecto
// ('borrador') ya hace que `reunion_abierta()` dé true.
export async function ensureReunion(creadaPorEmail: string, empresa = 'EMC'): Promise<string> {
  const creador = await getUsuario(creadaPorEmail)
  if (!creador) throw new Error(`ensureReunion: no existe el usuario ${creadaPorEmail}`)
  const r = await fetch(`${URL}/rest/v1/reuniones`, {
    method: 'POST', headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({
      empresa, titulo: `Reunión de prueba RLS — ${creadaPorEmail}`,
      fecha: new Date().toISOString().slice(0, 10), created_by: creador.id,
    }),
  })
  if (!r.ok) throw new Error(`ensureReunion ${creadaPorEmail}: ${r.status} ${await r.text()}`)
  const [row] = (await r.json()) as { id: string }[]
  return row.id
}

export async function deleteReunion(id: string) {
  await fetch(`${URL}/rest/v1/reuniones?id=eq.${id}`, { method: 'DELETE', headers: H })
}
