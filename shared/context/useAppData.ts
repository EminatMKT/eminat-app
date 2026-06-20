'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/shared/db/supabase'
import { signOutAndRedirect } from '@/shared/db/session'
import { clearAuthCookies } from '@/shared/db/clearAuthCookies'
import { startAppData } from './loadAppData'
import { useClock } from './useClock'

// Estado global de la app + carga inicial + handlers. La derivación de permisos
// y el theming los arma AppProvider sobre lo que devuelve este hook.
export function useAppData() {
  const [usuario, setUsuario] = useState<any>(null)
  // Estado terminal cuando el perfil no carga: AppProvider renderiza una pantalla
  // estable en vez de auto-navegar (evita el bucle de reloads ante fallo persistente).
  const [sessionError, setSessionError] = useState<null | 'no-session' | 'no-profile' | 'error'>(null)
  const [actividades, setActividades] = useState<any[]>([])
  const [equipo, setEquipo] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(true)
  const [onlineCount, setOnlineCount] = useState(0)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [notificaciones, setNotificaciones] = useState<any[]>([])
  const [notifAbiertas, setNotifAbiertas] = useState(false)
  const [adminUsuarios, setAdminUsuarios] = useState<any[]>([])
  const horaActual = useClock()

  const mostrarMensaje = useCallback((tipo: 'ok' | 'error', texto: string) => {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 3000)
  }, [])

  const handleLogout = useCallback(async () => {
    // signOut() puede colgarse si la sesión quedó en mal estado. signOutAndRedirect
    // garantiza el redirect aunque eso pase (timeout). clearAuthCookies antes de
    // navegar evita que una cookie stale rebote /login → / en el middleware.
    await signOutAndRedirect(
      () => supabase.auth.signOut(),
      (url) => { clearAuthCookies(); window.location.href = url },
    )
  }, [])

  useEffect(() => startAppData({
    setUsuario, setSessionError, setLoading, setOnlineCount,
    setNotificaciones, setActividades, setEquipo, setUsuarios, setAdminUsuarios,
  }), [])

  return {
    usuario, sessionError, actividades, setActividades, equipo, usuarios, setUsuarios,
    loading, dark, setDark, horaActual, onlineCount,
    mensaje, notificaciones, setNotificaciones, notifAbiertas, setNotifAbiertas,
    adminUsuarios, setAdminUsuarios, mostrarMensaje, handleLogout,
  }
}
