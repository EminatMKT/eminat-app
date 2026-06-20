import type { Dispatch, SetStateAction } from 'react'
import { supabase } from '@/shared/db/supabase'
import { usuariosRepo, actividadesRepo, notificacionesRepo } from '@/shared/data'
import { loadProfile } from '@/shared/db/session'
import { clearAuthCookies } from '@/shared/db/clearAuthCookies'
import { normalizeRole } from '@/shared/auth/permissions'
import { CARGOS_DIR } from '@/shared/constants/directorio'

type Setters = {
  setUsuario: (u: any) => void
  setSessionError: (r: 'no-session' | 'no-profile' | 'error') => void
  setLoading: (v: boolean) => void
  setOnlineCount: (n: number) => void
  setNotificaciones: Dispatch<SetStateAction<any[]>>
  setActividades: (a: any[]) => void
  setEquipo: (e: any[]) => void
  setUsuarios: (u: any[]) => void
  setAdminUsuarios: (u: any[]) => void
}

// Carga inicial de la app tras montar el provider: perfil (crítico), heartbeat,
// online count, notificaciones (+ realtime), actividades, equipo, usuarios y
// adminUsuarios. Devuelve el cleanup (intervalo de heartbeat + canal realtime).
export function startAppData(s: Setters): () => void {
  let heartbeatInterval: ReturnType<typeof setInterval>
  let realtimeChannel: any

  async function init() {
    try {
      // 1-2. Carga crítica del perfil (sesión + fila activa en 'usuarios' por email).
      //    loadProfile falla en cerrado: ante no-session / no-profile / error,
      //    cerramos sesión y mostramos pantalla estable en vez de UI zombie.
      const result = await loadProfile(supabase)
      if (!result.ok) {
        // NO auto-navegar: un redirect en cada montaje, ante fallo persistente,
        // genera bucle de reloads. Pantalla de error estable + signOut best-effort.
        s.setSessionError(result.reason ?? 'error')
        s.setLoading(false)
        clearAuthCookies()
        void supabase.auth.signOut().catch(() => {})
        return
      }
      const usr = result.usuario
      s.setUsuario(usr)

      const isSuperAdmin = normalizeRole(usr.rol) === 'admin'

      // 3. Heartbeat - update online_at every 30s
      const doHeartbeat = () => {
        usuariosRepo.touchOnline(usr.id)
      }
      doHeartbeat()
      heartbeatInterval = setInterval(doHeartbeat, 30000)

      // 4. Count online users (online_at within last 5 minutes)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { count } = await usuariosRepo.countOnlineSince(fiveMinAgo)
      s.setOnlineCount(count || 0)

      // 5. Load notifications + realtime subscription
      const { data: notifs } = await notificacionesRepo.listForUser(usr.id)
      s.setNotificaciones(notifs || [])

      realtimeChannel = notificacionesRepo.subscribeToUserNotifs(usr.id, (row: any) => {
        s.setNotificaciones(prev => [row, ...prev])
      })

      // 6. Load actividades
      const { data: acts } = await actividadesRepo.list(
        !isSuperAdmin && usr.responsable_ref ? usr.responsable_ref : undefined
      )
      s.setActividades(acts || [])

      // 7. Load equipo from v_equipo_hoy
      const { data: eq } = await usuariosRepo.equipoHoy()
      s.setEquipo(eq || [])

      // 8. Load usuarios (activo=true)
      const { data: usrs } = await usuariosRepo.listActivos()
      s.setUsuarios(usrs || [])

      // 9. Load adminUsuarios with CARGOS_DIR mapping
      const { data: allUsrs } = await usuariosRepo.listAll()
      s.setAdminUsuarios((allUsrs || []).map((u: any) => ({ ...u, cargo: u.cargo || CARGOS_DIR[u.email?.toLowerCase()] || '' })))
    } catch (err) {
      console.error('AppContext init error:', err)
    } finally {
      s.setLoading(false)
    }
  }

  init()

  return () => {
    clearInterval(heartbeatInterval)
    if (realtimeChannel) notificacionesRepo.removeChannel(realtimeChannel)
  }
}
