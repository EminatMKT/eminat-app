// Borra las cookies de auth de Supabase (sb-*-auth-token) del lado del cliente.
// El middleware decide por PRESENCIA de la cookie, no por validez: si el token
// quedó corrupto/expirado, supabase.auth.signOut() puede no limpiarla y el
// middleware rebota /login → / en bucle. Limpiarla a mano garantiza la salida.
export function clearAuthCookies() {
  if (typeof document === 'undefined') return
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim()
    if (name.startsWith('sb-')) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    }
  }
}
