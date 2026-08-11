import { ROUTES } from '@/shared/auth/permissions'

// Lógica de sesión extraída de AppContext para poder testearla de forma aislada.
// Cubre dos fallos de resiliencia que dejaban la app en estado zombie:
//   A) el logout podía colgarse si supabase.auth.signOut() no resolvía.
//   B) un fallo al cargar el perfil dejaba la UI a medias sin echar al login.

// ── A — Logout a prueba de cuelgues ───────────────────────────────
// signOut() puede colgarse (sesión en mal estado) o rechazar (red caída).
// Pase lo que pase, redirigimos: el usuario nunca queda atrapado.
export async function signOutAndRedirect(
  signOut: () => Promise<unknown>,
  redirect: (url: string) => void,
  timeoutMs = 3000,
): Promise<void> {
  try {
    await Promise.race([
      signOut(),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ])
  } catch {
    // Ignoramos cualquier error de signOut — redirigimos de todas formas.
  } finally {
    redirect(ROUTES.login)
  }
}

// ── B — Carga del perfil crítico, fail-closed ─────────────────────
// Perfil mínimo que el caller (loadAppData) consume tras loadProfile. La fila real
// trae más columnas; acá solo declaramos las que se leen aguas abajo.
export type ProfileUser = {
  id: string
  rol?: string
  activo?: boolean
}

// Cliente Supabase acotado a lo que usa loadProfile. `select` devuelve `unknown`:
// el builder concreto (recursivo y muy genérico en supabase-js) dispararía un chequeo
// de instanciación excesivamente profundo (TS2589) si se modelara la cadena entera;
// devolver unknown corta esa comparación y la cadena eq→eq→single se estrecha adentro.
type SupabaseLike = {
  auth: { getUser: () => Promise<{ data: { user: { email?: string } | null } }> }
  from: (table: string) => { select: (columns: string) => unknown }
}

// Forma de la cadena de filtros que loadProfile invoca sobre el resultado de select.
// PromiseLike (no Promise) porque los builders de supabase-js son thenables.
type ProfileFilterChain = {
  eq: (column: string, value: unknown) => {
    eq: (column: string, value: unknown) => {
      single: () => PromiseLike<{ data: unknown; error: unknown }>
    }
  }
}

// Tipo plano (no discriminated union): el proyecto compila con strict:false, donde
// el narrowing de unions por el discriminante no es confiable. Con campos opcionales,
// el caller accede a .reason / .usuario sin depender del narrowing.
export type ProfileResult = {
  ok: boolean
  usuario?: ProfileUser
  reason?: 'no-session' | 'no-profile' | 'error'
}

// Devuelve un resultado discriminado en vez de lanzar/devolver null silencioso.
// El caller decide: ok → setear usuario; cualquier otro caso → cerrar sesión.
export async function loadProfile(client: SupabaseLike): Promise<ProfileResult> {
  try {
    const { data: { user } } = await client.auth.getUser()
    if (!user) return { ok: false, reason: 'no-session' }

    const query = client.from('usuarios').select('*') as ProfileFilterChain
    const { data: usuario, error } = await query
      .eq('email', user.email)
      .eq('activo', true)
      .single()

    if (error || !usuario) return { ok: false, reason: 'no-profile' }
    return { ok: true, usuario: usuario as ProfileUser }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
