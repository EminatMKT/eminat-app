import type { Dispatch, SetStateAction } from 'react'
import { supabase } from '@/shared/db/supabase'
import { usuariosRepo, actividadesRepo, notificacionesRepo, rolesRepo } from '@/shared/data'
import { loadProfile } from '@/shared/db/session'
import * as auth from '@/shared/db/auth'
import { clearAuthCookies } from '@/shared/db/clearAuthCookies'
import { normalizeRole, getModulesForRole, moduleForPath, ROUTES } from '@/shared/auth/permissions'
import type { RoleRow, RoleModuleMap, ModuleSlug } from '@/shared/auth/permissions'
import { CARGOS_DIR } from '@/shared/constants/directorio'

// Carrera promesa-vs-timeout: si la promesa no resuelve en `ms`, devuelve `fallback`.
// Evita que un await colgado (red/auth) deje el spinner "Cargando…" para siempre.
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>(res => setTimeout(() => res(fallback), ms))])
}

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
  setRoles: (r: RoleRow[]) => void
  setRoleModuleMap: (m: RoleModuleMap) => void
}

// Carga inicial de la app tras montar el provider: perfil (crítico), heartbeat,
// online count, notificaciones (+ realtime), actividades, equipo, usuarios y
// adminUsuarios. Devuelve el cleanup (intervalo de heartbeat + canal realtime).
export function startAppData(s: Setters): () => void {
  let heartbeatInterval: ReturnType<typeof setInterval>
  let realtimeChannel: any
  let userRowChannel: any

  async function init() {
    try {
      // 1-2. Carga crítica del perfil (sesión + fila activa en 'usuarios' por email).
      //    loadProfile falla en cerrado: ante no-session / no-profile / error,
      //    cerramos sesión y mostramos pantalla estable en vez de UI zombie.
      // 15s de techo: si la sesión/perfil no resuelve (red caída, token en mal
      // estado), tratamos como error en vez de colgar el spinner indefinidamente.
      const result = await withTimeout(loadProfile(supabase), 15000, { ok: false as const, reason: 'error' as const })
      if (!result.ok) {
        // NO auto-navegar: un redirect en cada montaje, ante fallo persistente,
        // genera bucle de reloads. Pantalla de error estable + signOut best-effort.
        s.setSessionError(result.reason ?? 'error')
        s.setLoading(false)
        clearAuthCookies()
        void auth.signOut().catch(() => {})
        return
      }
      const usr = result.usuario
      s.setUsuario(usr)

      // Cargar roles + role_modules en paralelo y construir el mapa role_key → modules.
      // ACOTADO con timeout: es el único await entre el perfil y el setLoading(false)
      // de abajo. Si se cuelga (lock de auth de supabase-js bajo StrictMode, token
      // stale, red), sin techo el spinner "Cargando…" queda infinito. Ante el cuelgue
      // caemos a la misma pantalla estable que un fallo de perfil — nunca UI zombie.
      const rolesRes = await withTimeout(
        Promise.all([rolesRepo.listRoles(), rolesRepo.listRoleModules()]),
        10000,
        null,
      )
      if (!rolesRes) {
        s.setSessionError('error')
        s.setLoading(false)
        clearAuthCookies()
        void auth.signOut().catch(() => {})
        return
      }
      const [{ data: roleRows }, { data: roleMods }] = rolesRes
      s.setRoles((roleRows as RoleRow[]) || [])
      const map: RoleModuleMap = {}
      for (const rm of (roleMods || []) as { role_key: string; module_slug: ModuleSlug }[]) {
        ;(map[rm.role_key] ??= []).push(rm.module_slug)
      }
      s.setRoleModuleMap(map)

      // Shell listo: perfil + permisos cargados. Soltamos el loading YA para que la
      // UI aparezca; lo de abajo (heartbeat, notifs, actividades, equipo, usuarios)
      // se hidrata de fondo y un cuelgue suyo no debe dejar el spinner infinito.
      s.setLoading(false)

      const isAdmin = normalizeRole(usr.rol) === 'admin'

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

      // Realtime sobre la propia fila: el admin cambia rol/activo y se refleja YA,
      // sin esperar un refresh. Ignora updates irrelevantes (p.ej. el heartbeat de
      // online_at) comparando contra el último rol/activo conocido.
      let lastRol = usr.rol
      let lastActivo = usr.activo
      userRowChannel = usuariosRepo.subscribeToUserRow(usr.id, (row: any) => {
        if (row.rol === lastRol && row.activo === lastActivo) return
        lastRol = row.rol; lastActivo = row.activo
        // Desactivado por el admin → expulsar al login.
        if (row.activo === false) {
          clearAuthCookies()
          void auth.signOut().catch(() => {})
          window.location.href = ROUTES.login
          return
        }
        // Cambio de rol → refrescar perfil (AppContext recalcula módulos solo).
        s.setUsuario(row)
        // Si quedó parado en un módulo que ya no tiene, mandarlo a Home.
        const slug = moduleForPath(window.location.pathname)
        if (slug && !getModulesForRole(map, normalizeRole(row.rol)).includes(slug)) {
          window.location.href = ROUTES.home
        }
      })

      // 6. Load actividades
      const { data: acts } = await actividadesRepo.list(
        !isAdmin && usr.responsable_ref ? usr.responsable_ref : undefined
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
    if (userRowChannel) usuariosRepo.removeChannel(userRowChannel)
  }
}
