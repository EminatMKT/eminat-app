import type { Dispatch, SetStateAction } from 'react'
import { supabase } from '@/shared/db/supabase'
import { usuariosRepo, actividadesRepo, notificacionesRepo, rolesRepo, orgRepo, removeChannel } from '@/shared/data'
import type { RealtimeChannel } from '@/shared/data/realtime'
import { loadProfile } from '@/shared/db/session'
import * as auth from '@/shared/db/auth'
import { clearAuthCookies } from '@/shared/db/clearAuthCookies'
import { normalizeRole, getModulesForRole, moduleForPath, ROUTES } from '@/shared/auth/permissions'
import type { RoleRow, RoleModuleMap, ModuleSlug } from '@/shared/auth/permissions'

// Carrera promesa-vs-timeout: si la promesa no resuelve en `ms`, devuelve `fallback`.
// Evita que un await colgado (red/auth) deje el spinner "Cargando…" para siempre.
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>(res => setTimeout(() => res(fallback), ms))])
}

// Formas de las filas dinámicas que devuelve Supabase. Se declaran acá (única
// fuente) y useAppData/AppContext las importan para tipar estado y contexto.
// Campos opcionales: son proyecciones de la DB, no todas las columnas vienen
// siempre. La estructura de `equipos` refleja el embed de usuariosRepo.listActivos.
export interface Usuario {
  id: string
  rol?: string
  nombre?: string
  apellido?: string
  color?: string
  ubicacion?: string
  email?: string
  empresa_id?: string | null
  marca_hora?: string
  activo?: boolean
  validado?: boolean
  online_at?: string | null
  responsable_ref?: string | null
  equipo_id?: string | null
  jornada_id?: string | null
  vinculacion_id?: string | null
  // Cargos N:N (tabla puente usuario_cargos). `cargos` viene embebido cuando la
  // query lo pide; `cargo_id` siempre, para editar la selección.
  usuario_cargos?: { cargo_id?: string; cargos?: { codigo: string; nombre: string } | null }[]
  equipos?: {
    codigo?: string | null
    nombre?: string | null
    lider_id?: string | null
    departamentos?: { codigo?: string | null; nombre?: string | null } | null
  } | null
}

export interface Notificacion {
  id?: string
  leida?: boolean
  actividad_id?: string | null
  titulo?: string
  mensaje?: string
  created_at?: string
}

// Actividad de marketing (tabla `actividades`). Tipo canónico compartido: este
// módulo la almacena/pasa sin leer sus campos, pero las vistas de Stratix leen
// campos opcionales. Index signature porque los registros vienen de Supabase.
// `features/stratix-mkt/types` la re-exporta para no duplicar la forma.
export type Actividad = {
  id?: string
  titulo?: string
  descripcion?: string
  empresa?: string
  responsable_ref?: string
  mes?: string
  trimestre?: string
  estado?: string
  horas?: number | string
  dias_produccion?: number | string
  fecha_entrega?: string
  solicitado_por?: string
  drive_url?: string
  [k: string]: unknown
}
export type Equipo = Record<string, unknown>

// Fila de cualquiera de los tres catálogos organizacionales (departamentos,
// equipos, cargos). Una sola forma: `id/codigo/nombre` son comunes y el resto
// son columnas propias de un catálogo — opcionales para el resto.
export interface OrgRow {
  id: string
  codigo: string
  nombre: string
  color?: string
  icono?: string | null
  departamento_id?: string | null
  lider_id?: string | null
  horas_dia?: number
  activo?: boolean
  recibe_actividades?: boolean
}

export type Setters = {
  setUsuario: (u: Usuario) => void
  setSessionError: (r: 'no-session' | 'no-profile' | 'error') => void
  setLoading: (v: boolean) => void
  setOnlineCount: (n: number) => void
  setNotificaciones: Dispatch<SetStateAction<Notificacion[]>>
  setActividades: (a: Actividad[]) => void
  setEquipo: (e: Equipo[]) => void
  setUsuarios: (u: Usuario[]) => void
  setAdminUsuarios: (u: Usuario[]) => void
  setRoles: (r: RoleRow[]) => void
  setRoleModuleMap: (m: RoleModuleMap) => void
  setOrg: (o: OrgCatalogs) => void
}

// Los cuatro catálogos organizacionales, en la misma forma que los expone el
// contexto (una clave por OrgCat).
export type OrgCatalogs = {
  empresas: OrgRow[]; departamentos: OrgRow[]; equipos: OrgRow[]
  cargos: OrgRow[]; jornadas: OrgRow[]; vinculaciones: OrgRow[]
}

// Los lee el panel admin (CRUD) y los selects de la ficha de usuario. Se comparte
// con useAppData.reloadOrg para no duplicar las queries.
export async function fetchOrg(): Promise<OrgCatalogs> {
  const [emp, dep, eq, car, jor, vin] = await Promise.all([
    orgRepo.listEmpresas(), orgRepo.listDepartamentos(), orgRepo.listEquipos(),
    orgRepo.listCargos(), orgRepo.listJornadas(), orgRepo.listVinculaciones(),
  ])
  return {
    empresas: (emp.data as OrgRow[]) || [],
    departamentos: (dep.data as OrgRow[]) || [],
    equipos: (eq.data as OrgRow[]) || [],
    cargos: (car.data as OrgRow[]) || [],
    jornadas: (jor.data as OrgRow[]) || [],
    vinculaciones: (vin.data as OrgRow[]) || [],
  }
}

// Carga inicial de la app tras montar el provider: perfil (crítico), heartbeat,
// online count, notificaciones (+ realtime), actividades, equipo, usuarios y
// adminUsuarios. Devuelve el cleanup (intervalo de heartbeat + canal realtime).
export function startAppData(s: Setters): () => void {
  let heartbeatInterval: ReturnType<typeof setInterval>
  let realtimeChannel: RealtimeChannel | undefined
  let userRowChannel: RealtimeChannel | undefined

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

      // Las suscripciones Realtime son ACCESORIAS: si fallan, el usuario pierde el
      // vivo pero no los datos. Antes un throw acá abortaba el resto del init
      // (actividades, equipo, usuarios, catálogos) por el catch de abajo.
      try {
        realtimeChannel = notificacionesRepo.subscribeToUserNotifs(usr.id, (row: Notificacion) => {
          s.setNotificaciones(prev => [row, ...prev])
        })
      } catch (err) {
        console.warn('Realtime de notificaciones no disponible:', err)
      }

      // Realtime sobre la propia fila: el admin cambia rol/activo y se refleja YA,
      // sin esperar un refresh. Ignora updates irrelevantes (p.ej. el heartbeat de
      // online_at) comparando contra el último rol/activo conocido.
      let lastRol = usr.rol
      let lastActivo = usr.activo
      try {
        userRowChannel = usuariosRepo.subscribeToUserRow(usr.id, (row: Usuario) => {
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
      } catch (err) {
        console.warn('Realtime de la fila de usuario no disponible:', err)
      }

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

      // 9. Load adminUsuarios (trae los cargos N:N embebidos para la tabla admin)
      const { data: allUsrs } = await usuariosRepo.listAll()
      s.setAdminUsuarios(allUsrs || [])

      // 10. Catálogos organizacionales (CRUD del tab Organización + multiselect de cargos)
      s.setOrg(await fetchOrg())
    } catch (err) {
      console.error('AppContext init error:', err)
    } finally {
      s.setLoading(false)
    }
  }

  init()

  return () => {
    clearInterval(heartbeatInterval)
    if (realtimeChannel) removeChannel(realtimeChannel)
    if (userRowChannel) removeChannel(userRowChannel)
  }
}
