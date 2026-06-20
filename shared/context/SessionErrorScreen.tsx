'use client'
import * as auth from '@/shared/db/auth'
import { clearAuthCookies } from '@/shared/db/clearAuthCookies'

// Pantalla de error estable cuando el perfil no carga: en vez de auto-navegar
// (que generaba bucle) o dejar la UI zombie, el usuario sale con un clic manual
// (hard redirect, sin posibilidad de loop).
export default function SessionErrorScreen({ reason }: { reason: 'no-session' | 'no-profile' | 'error' }) {
  const msg = reason === 'no-profile'
    ? 'Tu cuenta no tiene un perfil activo.'
    : reason === 'no-session'
      ? 'Tu sesión expiró.'
      : 'No se pudo cargar tu sesión.'
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F', gap: 14, color: '#fff', fontFamily: 'DM Sans, sans-serif', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{msg}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 420, lineHeight: 1.5 }}>
        Volvé a iniciar sesión. Si el problema persiste, contactá al administrador.
      </div>
      <button onClick={() => { clearAuthCookies(); void auth.signOut().catch(() => {}); window.location.href = '/login' }}
        style={{ marginTop: 8, padding: '10px 22px', borderRadius: 10, border: 'none', background: '#7C6FF7', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        Ir al login
      </button>
    </div>
  )
}
