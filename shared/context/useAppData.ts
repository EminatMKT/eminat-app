'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/shared/db/supabase'
import { signOutAndRedirect, loadProfile } from '@/shared/db/session'
import { clearAuthCookies } from '@/shared/db/clearAuthCookies'
import { normalizeRole } from '@/shared/auth/permissions'
import { CARGOS_DIR } from '@/shared/constants/directorio'

// Carga de sesión/perfil + estado global (usuario, actividades, equipo, usuarios,
// notificaciones, reloj, online count) + handlers. La derivación de permisos y el
// theming los arma AppProvider sobre lo que devuelve este hook.
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
  const [horaActual, setHoraActual] = useState('')
  const [onlineCount, setOnlineCount] = useState(0)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [notificaciones, setNotificaciones] = useState<any[]>([])
  const [notifAbiertas, setNotifAbiertas] = useState(false)
  const [adminUsuarios, setAdminUsuarios] = useState<any[]>([])

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

  useEffect(() => {
    let heartbeatInterval: ReturnType<typeof setInterval>
    let clockInterval: ReturnType<typeof setInterval>
    let realtimeChannel: any

    async function init() {
      try {
        // 1-2. Carga crítica del perfil (sesión + fila activa en 'usuarios' por email).
        //    loadProfile falla en cerrado: ante no-session / no-profile / error,
        //    cerramos sesión y vamos al login en vez de dejar la UI en estado zombie
        //    (perfil sin cargar pero sesión viva → "Welcome, undefined" + Sign out muerto).
        const result = await loadProfile(supabase)
        if (!result.ok) {
          // NO auto-navegar: un redirect en cada montaje, ante un fallo persistente,
          // genera un bucle de reloads. Mostramos una pantalla de error estable y
          // limpiamos la sesión best-effort (sin await, por si signOut se cuelga).
          setSessionError(result.reason ?? 'error')
          setLoading(false)
          clearAuthCookies()
          void supabase.auth.signOut().catch(() => {})
          return
        }
        const usr = result.usuario
        setUsuario(usr)

        const normalized = normalizeRole(usr.rol)
        const isSuperAdmin = normalized === 'admin'

        // 3. Heartbeat - update online_at every 30s
        const doHeartbeat = () => {
          supabase.from('usuarios').update({ online_at: new Date().toISOString() }).eq('id', usr.id).then(() => {})
        }
        doHeartbeat()
        heartbeatInterval = setInterval(doHeartbeat, 30000)

        // 4. Count online users (online_at within last 5 minutes)
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const { count } = await supabase
          .from('usuarios')
          .select('*', { count: 'exact', head: true })
          .gte('online_at', fiveMinAgo)
        setOnlineCount(count || 0)

        // 5. Load notifications + realtime subscription
        const { data: notifs } = await supabase
          .from('notificaciones')
          .select('*')
          .eq('usuario_id', usr.id)
          .order('created_at', { ascending: false })
          .limit(50)
        setNotificaciones(notifs || [])

        realtimeChannel = supabase
          .channel(`notif-${usr.id}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${usr.id}` },
            (payload: any) => {
              setNotificaciones(prev => [payload.new, ...prev])
            }
          )
          .subscribe()

        // 6. Load actividades
        let actQuery = supabase.from('actividades').select('*').order('created_at', { ascending: false })
        if (!isSuperAdmin && usr.responsable_ref) {
          actQuery = actQuery.eq('responsable_ref', usr.responsable_ref)
        }
        const { data: acts } = await actQuery
        setActividades(acts || [])

        // 7. Load equipo from v_equipo_hoy
        const { data: eq } = await supabase.from('v_equipo_hoy').select('*')
        setEquipo(eq || [])

        // 8. Load usuarios (activo=true)
        const { data: usrs } = await supabase
          .from('usuarios')
          .select('*')
          .eq('activo', true)
          .order('nombre', { ascending: true })
        setUsuarios(usrs || [])

        // 9. Load adminUsuarios with CARGOS_DIR mapping
        const { data: allUsrs } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false })
        setAdminUsuarios((allUsrs || []).map((u: any) => ({ ...u, cargo: u.cargo || CARGOS_DIR[u.email?.toLowerCase()] || '' })))
      } catch (err) {
        console.error('AppContext init error:', err)
      } finally {
        setLoading(false)
      }
    }

    init()

    // 10. Update time every second
    const updateTime = () => {
      setHoraActual(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateTime()
    clockInterval = setInterval(updateTime, 1000)

    return () => {
      clearInterval(heartbeatInterval)
      clearInterval(clockInterval)
      if (realtimeChannel) supabase.removeChannel(realtimeChannel)
    }
  }, [])

  return {
    usuario, sessionError, actividades, setActividades, equipo, usuarios, setUsuarios,
    loading, dark, setDark, horaActual, onlineCount,
    mensaje, notificaciones, setNotificaciones, notifAbiertas, setNotifAbiertas,
    adminUsuarios, setAdminUsuarios, mostrarMensaje, handleLogout,
  }
}
