'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ROLES = ['pasante', 'colaborador', 'coordinador', 'superadmin']
const TIPOS = ['A', 'B']
const COLORES = ['#7C6FF7', '#34D399', '#F472B6', '#60A5FA', '#FB923C', '#FBB040', '#A78BFA', '#F87171']

const ROL_COLORS: Record<string, { bg: string; color: string }> = {
  superadmin: { bg: 'rgba(248,113,113,.12)', color: '#F87171' },
  coordinador: { bg: 'rgba(124,111,247,.1)', color: '#7C6FF7' },
  colaborador: { bg: 'rgba(52,211,153,.1)', color: '#34D399' },
  pasante: { bg: 'rgba(251,176,64,.1)', color: '#FBB040' },
  externo: { bg: 'rgba(148,148,179,.1)', color: '#9494B3' },
}

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [usuarioActual, setUsuarioActual] = useState<any>(null)
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEliminar, setModalEliminar] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const router = useRouter()

  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '', apellido: '', email: '', password: '',
    rol: 'pasante', tipo: 'B', color: '#7C6FF7',
  })

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: usr } = await supabase.from('usuarios').select('*').eq('email', user.email).single()
    if (usr?.rol !== 'superadmin') { router.push('/dashboard'); return }
    setUsuarioActual(usr)
    await recargarUsuarios()
    setLoading(false)
  }

  async function recargarUsuarios() {
    const { data } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false })
    setUsuarios(data || [])
  }

  function mostrarMensaje(tipo: 'ok' | 'error', texto: string) {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 3000)
  }

  async function crearUsuario() {
    if (!nuevoUsuario.nombre || !nuevoUsuario.apellido || !nuevoUsuario.email || !nuevoUsuario.password) {
      mostrarMensaje('error', 'Completa todos los campos obligatorios')
      return
    }
    setGuardando(true)
    try {
      const { data, error } = await supabase.auth.admin
        ? await (supabase as any).auth.admin.createUser({
            email: nuevoUsuario.email,
            password: nuevoUsuario.password,
            email_confirm: true,
          })
        : { data: null, error: { message: 'No admin access' } }

      // Si no tenemos acceso admin, usamos signUp normal
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: nuevoUsuario.email,
        password: nuevoUsuario.password,
      })

      if (signUpError) {
        mostrarMensaje('error', signUpError.message)
        setGuardando(false)
        return
      }

      const uid = signUpData?.user?.id
      if (uid) {
        await supabase.from('usuarios').upsert({
          id: uid,
          nombre: nuevoUsuario.nombre,
          apellido: nuevoUsuario.apellido,
          email: nuevoUsuario.email,
          rol: nuevoUsuario.rol,
          tipo: nuevoUsuario.tipo,
          color: nuevoUsuario.color,
          activo: true,
          validado: true,
          ubicacion: 'Guayaquil, Ecuador',
        })
      }

      mostrarMensaje('ok', `Usuario ${nuevoUsuario.nombre} creado correctamente`)
      setModalCrear(false)
      setNuevoUsuario({ nombre: '', apellido: '', email: '', password: '', rol: 'pasante', tipo: 'B', color: '#7C6FF7' })
      await recargarUsuarios()
    } catch {
      mostrarMensaje('error', 'Error al crear el usuario')
    }
    setGuardando(false)
  }

  async function cambiarRol(id: string, rol: string) {
    await supabase.from('usuarios').update({ rol }).eq('id', id)
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, rol } : u))
    mostrarMensaje('ok', 'Rol actualizado')
  }

  async function toggleActivo(id: string, activo: boolean) {
    await supabase.from('usuarios').update({ activo: !activo }).eq('id', id)
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: !activo } : u))
    mostrarMensaje('ok', !activo ? 'Usuario activado' : 'Usuario desactivado')
  }

  async function validarUsuario(id: string) {
    await supabase.from('usuarios').update({ validado: true, activo: true }).eq('id', id)
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, validado: true, activo: true } : u))
    mostrarMensaje('ok', 'Usuario validado y activado')
  }

  async function eliminarUsuario(id: string) {
    await supabase.from('usuarios').delete().eq('id', id)
    setUsuarios(prev => prev.filter(u => u.id !== id))
    setModalEliminar(null)
    mostrarMensaje('ok', 'Usuario eliminado')
  }

  const usuariosFiltrados = usuarios
    .filter(u => filtroRol === 'todos' || u.rol === filtroRol)
    .filter(u =>
      busqueda === '' ||
      `${u.nombre} ${u.apellido}`.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email?.toLowerCase().includes(busqueda.toLowerCase())
    )

  const stats = {
    total: usuarios.length,
    activos: usuarios.filter(u => u.activo && u.validado).length,
    pendientes: usuarios.filter(u => !u.validado).length,
    pasantes: usuarios.filter(u => u.rol === 'pasante').length,
  }

  const bg = '#0A0A0F'
  const s1 = '#111118'
  const s2 = '#1A1A24'
  const border = 'rgba(255,255,255,0.07)'
  const t1 = '#FFFFFF'
  const t2 = 'rgba(255,255,255,0.55)'
  const t3 = 'rgba(255,255,255,0.28)'
  const red = '#F87171'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ fontSize: 14, color: t3 }}>Cargando panel admin...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: bg, color: t1, fontFamily: 'DM Sans, sans-serif' }}>

      {/* TOPBAR */}
      <div style={{ background: s1, borderBottom: `1px solid ${border}`, padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: red, boxShadow: `0 0 10px ${red}` }} />
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15 }}>Admin Panel</span>
          </div>
          <Link href="/dashboard" style={{ fontSize: 12, color: t3, textDecoration: 'none', padding: '4px 10px', borderRadius: 8, border: `1px solid ${border}` }}>
            ← Dashboard
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {mensaje && (
            <div style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: mensaje.tipo === 'ok' ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)', color: mensaje.tipo === 'ok' ? '#34D399' : red, border: `1px solid ${mensaje.tipo === 'ok' ? '#34D39940' : '#F8717140'}` }}>
              {mensaje.tipo === 'ok' ? '✓' : '✕'} {mensaje.texto}
            </div>
          )}
          <button
            onClick={() => setModalCrear(true)}
            style={{ padding: '8px 16px', borderRadius: 10, background: red, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + Crear usuario
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total usuarios', value: stats.total, color: '#7C6FF7' },
            { label: 'Activos y validados', value: stats.activos, color: '#34D399' },
            { label: 'Pendientes validar', value: stats.pendientes, color: '#FBB040' },
            { label: 'Pasantes', value: stats.pasantes, color: '#60A5FA' },
          ].map(s => (
            <div key={s.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontFamily: 'Syne', fontSize: 36, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: t3, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${border}`, background: s1, color: t1, fontSize: 13, outline: 'none', width: 260, fontFamily: 'DM Sans' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {['todos', ...ROLES].map(r => (
              <button key={r} onClick={() => setFiltroRol(r)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans',
                border: `1px solid ${filtroRol === r ? red : border}`,
                background: filtroRol === r ? `${red}20` : 'transparent',
                color: filtroRol === r ? red : t2,
              }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* TABLA */}
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Usuarios del sistema</div>
              <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{usuariosFiltrados.length} usuarios encontrados</div>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: s2 }}>
                  {['Usuario', 'Email', 'Rol', 'Tipo', 'Estado', 'Ubicacion', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${border}` }}>
                    {/* Usuario */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.color || '#7C6FF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {u.nombre?.[0]}{u.apellido?.[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: t1 }}>{u.nombre} {u.apellido}</div>
                          <div style={{ fontSize: 10, color: t3 }}>Tipo {u.tipo || 'B'}</div>
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td style={{ padding: '12px 16px', fontSize: 12, color: t3, fontFamily: 'DM Mono' }}>{u.email}</td>
                    {/* Rol — editable */}
                    <td style={{ padding: '12px 16px' }}>
                      {u.rol === 'superadmin' ? (
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontFamily: 'DM Mono', ...ROL_COLORS['superadmin'] }}>superadmin</span>
                      ) : (
                        <select
                          value={u.rol}
                          onChange={e => cambiarRol(u.id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: ROL_COLORS[u.rol]?.color || t2, fontSize: 11, fontFamily: 'DM Mono', cursor: 'pointer', outline: 'none' }}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </td>
                    {/* Tipo */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, color: t2, padding: '2px 8px', borderRadius: 6, border: `1px solid ${border}` }}>
                        Tipo {u.tipo || 'B'}
                      </span>
                    </td>
                    {/* Estado */}
                    <td style={{ padding: '12px 16px' }}>
                      {u.validado && u.activo ? (
                        <span style={{ fontSize: 11, color: '#34D399', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} /> Activo
                        </span>
                      ) : !u.validado ? (
                        <span style={{ fontSize: 11, color: '#FBB040' }}>Pendiente</span>
                      ) : (
                        <span style={{ fontSize: 11, color: red }}>Inactivo</span>
                      )}
                    </td>
                    {/* Ubicacion */}
                    <td style={{ padding: '12px 16px', fontSize: 11, color: t3 }}>{u.ubicacion || 'Guayaquil, Ecuador'}</td>
                    {/* Acciones */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {!u.validado && (
                          <button onClick={() => validarUsuario(u.id)} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, border: '1px solid rgba(52,211,153,.3)', background: 'transparent', color: '#34D399', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                            Validar
                          </button>
                        )}
                        {u.rol !== 'superadmin' && (
                          <button onClick={() => toggleActivo(u.id, u.activo)} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, border: `1px solid ${u.activo ? 'rgba(251,176,64,.3)' : 'rgba(52,211,153,.3)'}`, background: 'transparent', color: u.activo ? '#FBB040' : '#34D399', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                        {u.rol !== 'superadmin' && (
                          <button onClick={() => setModalEliminar(u.id)} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, border: `1px solid rgba(248,113,113,.3)`, background: 'transparent', color: red, cursor: 'pointer', fontFamily: 'DM Sans' }}>
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CREAR USUARIO */}
      {modalCrear && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 480, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800 }}>Crear nuevo usuario</div>
              <button onClick={() => setModalCrear(false)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Nombre *</label>
                <input type="text" value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Ariana"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${border}`, background: s2, color: t1, fontSize: 13, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Apellido *</label>
                <input type="text" value={nuevoUsuario.apellido} onChange={e => setNuevoUsuario(p => ({ ...p, apellido: e.target.value }))} placeholder="Ej. Sig-Tu"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${border}`, background: s2, color: t1, fontSize: 13, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Email *</label>
              <input type="email" value={nuevoUsuario.email} onChange={e => setNuevoUsuario(p => ({ ...p, email: e.target.value }))} placeholder="usuario@eminat.net o gmail para pasantes"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${border}`, background: s2, color: t1, fontSize: 13, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Contraseña temporal *</label>
              <input type="password" value={nuevoUsuario.password} onChange={e => setNuevoUsuario(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 caracteres"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${border}`, background: s2, color: t1, fontSize: 13, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Rol</label>
                <select value={nuevoUsuario.rol} onChange={e => setNuevoUsuario(p => ({ ...p, rol: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${border}`, background: s2, color: t1, fontSize: 13, fontFamily: 'DM Sans', outline: 'none' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Tipo jornada</label>
                <select value={nuevoUsuario.tipo} onChange={e => setNuevoUsuario(p => ({ ...p, tipo: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${border}`, background: s2, color: t1, fontSize: 13, fontFamily: 'DM Sans', outline: 'none' }}>
                  <option value="A">Tipo A — Staff</option>
                  <option value="B">Tipo B — Pasante</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>Color de avatar</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORES.map(c => (
                  <div key={c} onClick={() => setNuevoUsuario(p => ({ ...p, color: c }))}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: nuevoUsuario.color === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalCrear(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans' }}>
                Cancelar
              </button>
              <button onClick={crearUsuario} disabled={guardando} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: red, color: 'white', fontSize: 13, fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? .7 : 1, fontFamily: 'DM Sans' }}>
                {guardando ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR */}
      {modalEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Eliminar usuario</div>
            <div style={{ fontSize: 13, color: t2, marginBottom: 24, lineHeight: 1.5 }}>
              Esta accion es permanente y no se puede deshacer. El usuario perdera todo acceso al sistema.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalEliminar(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans' }}>
                Cancelar
              </button>
              <button onClick={() => eliminarUsuario(modalEliminar)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: red, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
