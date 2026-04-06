'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ROLES = ['pasante', 'colaborador', 'coordinador', 'superadmin']
const COLORES = ['#7C6FF7', '#34D399', '#F472B6', '#60A5FA', '#FB923C', '#FBB040', '#A78BFA', '#F87171']
const EMPRESAS = ['Eminat Holding', 'Eminat Research Group', 'Eminat Medical Center', 'Premier by Eminat', 'Vivi Negrete Foundation']

// Cargos del directorio — se asignan automáticamente por email
const CARGOS_DIRECTORIO: Record<string, string> = {
  'ceo@eminat.net': 'CEO',
  'javier@eminat.net': 'COO',
  'freddy@eminat.net': 'Marketing Director',
  'joselyne@eminat.net': 'Graphic Designer',
  'david@eminat.net': 'Graphic Designer and Animations',
  'jonathan@eminat.net': 'CRM Developer / Full Stack Developer',
  'ariana@eminat.net': 'Graphic Designer (Pasante)',
  'naomi@eminat.net': 'Community Manager (Pasante)',
  'bryan@eminat.net': 'Video Editor (Pasante)',
  'javier@emc.health': 'COO / Medical Director',
  'dmsardina@eminat.net': 'Director of Clinical Research Operations',
  'daniel@eminat.net': 'Director of Medical Center Operations',
  'ntorres@eminat.net': 'Finance and Administrative Director',
  'erick@eminat.net': 'Business Development Director',
  'raul@eminat.net': 'Director of Digital Transformation',
  'ivannia@eminat.net': 'Eminat Premier Manager',
  'majo@eminat.net': 'Accounting and Revenue Operations Lead',
  'ana@eminat.net': 'Accounting and Revenue Operations Coordinator',
  'landrade@eminat.net': 'Latin America Operations Manager',
  'randrade@eminat.net': 'Head of Partnerships',
  'lsalazar@eminat.net': 'Senior Clinical Research Coordinator',
  'diana@eminat.net': 'Senior Clinical Research Coordinator',
  'lcruz@eminat.net': 'Clinical Research Coordinator',
  'federico@eminat.net': 'Business Development Associate',
  'lina@eminat.net': 'Business Development Associate',
  'luis@eminat.net': 'Digital Transformation Consultant',
  'wagner@eminat.net': 'AI Developer',
  'giuliana@vivinegretefoundation.org': 'Operations Coordinator',
  'guisella@eminat.net': 'Patient Recruitment and Retention Coordinator',
  'gnegrete@eminat.net': 'Patient Recruitment and Retention Coordinator',
}

const ROL_COLORS: Record<string, { bg: string; color: string }> = {
  superadmin: { bg: 'rgba(248,113,113,.12)', color: '#F87171' },
  coordinador: { bg: 'rgba(124,111,247,.1)', color: '#7C6FF7' },
  colaborador: { bg: 'rgba(52,211,153,.1)', color: '#34D399' },
  pasante: { bg: 'rgba(251,176,64,.1)', color: '#FBB040' },
  externo: { bg: 'rgba(148,148,179,.1)', color: '#9494B3' },
}

const EMPRESA_COLORS: Record<string, string> = {
  'Eminat Holding': '#7C6FF7',
  'Eminat Research Group': '#60A5FA',
  'Eminat Medical Center': '#34D399',
  'Premier by Eminat': '#FB923C',
  'Vivi Negrete Foundation': '#F472B6',
}

interface UsuarioEdit {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  tipo: string
  color: string
  ubicacion: string
  empresa: string
  cargo: string
}

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [usuarioActual, setUsuarioActual] = useState<any>(null)
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEditar, setModalEditar] = useState<UsuarioEdit | null>(null)
  const [modalEliminar, setModalEliminar] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const router = useRouter()

  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '', apellido: '', email: '', password: '',
    rol: 'pasante', tipo: 'B', color: '#7C6FF7', empresa: 'Eminat Holding',
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
    // Prellenar cargo desde directorio si está vacío
    const conCargo = (data || []).map(u => ({
      ...u,
      cargo: u.cargo || CARGOS_DIRECTORIO[u.email?.toLowerCase()] || '',
    }))
    setUsuarios(conCargo)
  }

  function mostrarMensaje(tipo: 'ok' | 'error', texto: string) {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 3500)
  }

  function abrirEditar(u: any) {
    setModalEditar({
      id: u.id,
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      email: u.email || '',
      rol: u.rol || 'pasante',
      tipo: u.tipo || 'B',
      color: u.color || '#7C6FF7',
      ubicacion: u.ubicacion || 'Guayaquil, Ecuador',
      empresa: u.empresa || 'Eminat Holding',
      cargo: u.cargo || CARGOS_DIRECTORIO[u.email?.toLowerCase()] || '',
    })
  }

  async function guardarEdicion() {
    if (!modalEditar) return
    setGuardando(true)
    const { error } = await supabase.from('usuarios').update({
      nombre: modalEditar.nombre,
      apellido: modalEditar.apellido,
      rol: modalEditar.rol,
      tipo: modalEditar.tipo,
      color: modalEditar.color,
      ubicacion: modalEditar.ubicacion,
      empresa: modalEditar.empresa,
    }).eq('id', modalEditar.id)

    if (error) {
      mostrarMensaje('error', 'Error al guardar cambios')
    } else {
      mostrarMensaje('ok', `${modalEditar.nombre} actualizado correctamente`)
      setModalEditar(null)
      await recargarUsuarios()
    }
    setGuardando(false)
  }

  async function resetPassword(email: string, nombre: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      mostrarMensaje('error', 'Error al enviar el email')
    } else {
      mostrarMensaje('ok', `Email de recuperacion enviado a ${nombre}`)
    }
  }

  async function crearUsuario() {
    if (!nuevoUsuario.nombre || !nuevoUsuario.apellido || !nuevoUsuario.email || !nuevoUsuario.password) {
      mostrarMensaje('error', 'Completa todos los campos obligatorios')
      return
    }
    setGuardando(true)
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
        empresa: nuevoUsuario.empresa,
        cargo: CARGOS_DIRECTORIO[nuevoUsuario.email.toLowerCase()] || '',
        activo: true,
        validado: true,
        ubicacion: 'Guayaquil, Ecuador',
      })
    }
    mostrarMensaje('ok', `Usuario ${nuevoUsuario.nombre} creado correctamente`)
    setModalCrear(false)
    setNuevoUsuario({ nombre: '', apellido: '', email: '', password: '', rol: 'pasante', tipo: 'B', color: '#7C6FF7', empresa: 'Eminat Holding' })
    await recargarUsuarios()
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

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 9,
    border: `1px solid ${border}`, background: s2, color: t1,
    fontSize: 13, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' as const
  }

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
            Dashboard
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {mensaje && (
            <div style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: mensaje.tipo === 'ok' ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)', color: mensaje.tipo === 'ok' ? '#34D399' : red, border: `1px solid ${mensaje.tipo === 'ok' ? '#34D39940' : '#F8717140'}` }}>
              {mensaje.tipo === 'ok' ? '✓' : '✕'} {mensaje.texto}
            </div>
          )}
          <button onClick={() => setModalCrear(true)} style={{ padding: '8px 16px', borderRadius: 10, background: red, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Crear usuario
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>

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
          <input type="text" placeholder="Buscar por nombre o email..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ ...inputStyle, width: 260 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {['todos', ...ROLES].map(r => (
              <button key={r} onClick={() => setFiltroRol(r)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans',
                border: `1px solid ${filtroRol === r ? red : border}`,
                background: filtroRol === r ? `${red}20` : 'transparent',
                color: filtroRol === r ? red : t2,
              }}>{r}</button>
            ))}
          </div>
        </div>

        {/* TABLA */}
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}` }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t1 }}>Usuarios del sistema</div>
            <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>{usuariosFiltrados.length} usuarios — solo superadmin puede gestionar</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: s2 }}>
                  {['Usuario', 'Email', 'Cargo', 'Empresa', 'Rol', 'Tipo', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${border}` }}>
                    {/* Usuario */}
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: u.color || '#7C6FF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {u.nombre?.[0]}{u.apellido?.[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>{u.nombre} {u.apellido}</div>
                          <div style={{ fontSize: 10, color: t3 }}>{u.ubicacion || 'Guayaquil, Ecuador'}</div>
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td style={{ padding: '11px 14px', fontSize: 11, color: t3, fontFamily: 'DM Mono' }}>{u.email}</td>
                    {/* Cargo — solo lectura */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, color: t2 }}>{u.cargo || '—'}</span>
                    </td>
                    {/* Empresa */}
                    <td style={{ padding: '11px 14px' }}>
                      {u.empresa ? (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${EMPRESA_COLORS[u.empresa] || '#7C6FF7'}20`, color: EMPRESA_COLORS[u.empresa] || '#7C6FF7', fontWeight: 500 }}>
                          {u.empresa.replace('Eminat ', '').replace(' by Eminat', '')}
                        </span>
                      ) : <span style={{ fontSize: 10, color: t3 }}>Sin asignar</span>}
                    </td>
                    {/* Rol */}
                    <td style={{ padding: '11px 14px' }}>
                      {u.rol === 'superadmin' ? (
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontFamily: 'DM Mono', ...ROL_COLORS['superadmin'] }}>superadmin</span>
                      ) : (
                        <select value={u.rol} onChange={e => cambiarRol(u.id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: ROL_COLORS[u.rol]?.color || t2, fontSize: 11, fontFamily: 'DM Mono', cursor: 'pointer', outline: 'none' }}>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </td>
                    {/* Tipo */}
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, color: t2, padding: '2px 8px', borderRadius: 6, border: `1px solid ${border}` }}>
                        Tipo {u.tipo || 'B'}
                      </span>
                    </td>
                    {/* Estado */}
                    <td style={{ padding: '11px 14px' }}>
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
                    {/* Acciones */}
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <button onClick={() => abrirEditar(u)} style={{ padding: '4px 9px', borderRadius: 7, fontSize: 11, border: `1px solid rgba(124,111,247,.3)`, background: 'transparent', color: '#7C6FF7', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                          Editar
                        </button>
                        <button onClick={() => resetPassword(u.email, u.nombre)} style={{ padding: '4px 9px', borderRadius: 7, fontSize: 11, border: `1px solid rgba(96,165,250,.3)`, background: 'transparent', color: '#60A5FA', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                          Reset pwd
                        </button>
                        {!u.validado && (
                          <button onClick={() => validarUsuario(u.id)} style={{ padding: '4px 9px', borderRadius: 7, fontSize: 11, border: '1px solid rgba(52,211,153,.3)', background: 'transparent', color: '#34D399', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                            Validar
                          </button>
                        )}
                        {u.rol !== 'superadmin' && (
                          <button onClick={() => toggleActivo(u.id, u.activo)} style={{ padding: '4px 9px', borderRadius: 7, fontSize: 11, border: `1px solid ${u.activo ? 'rgba(251,176,64,.3)' : 'rgba(52,211,153,.3)'}`, background: 'transparent', color: u.activo ? '#FBB040' : '#34D399', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                        {u.rol !== 'superadmin' && (
                          <button onClick={() => setModalEliminar(u.id)} style={{ padding: '4px 9px', borderRadius: 7, fontSize: 11, border: `1px solid rgba(248,113,113,.3)`, background: 'transparent', color: red, cursor: 'pointer', fontFamily: 'DM Sans' }}>
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

      {/* MODAL EDITAR */}
      {modalEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800 }}>Editar usuario</div>
              <button onClick={() => setModalEditar(null)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Cargo — solo lectura */}
            {modalEditar.cargo && (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: `rgba(124,111,247,.08)`, border: `1px solid rgba(124,111,247,.2)` }}>
                <div style={{ fontSize: 10, color: t3, marginBottom: 3 }}>CARGO INSTITUCIONAL</div>
                <div style={{ fontSize: 13, color: '#7C6FF7', fontWeight: 500 }}>{modalEditar.cargo}</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Nombre</label>
                <input type="text" value={modalEditar.nombre} onChange={e => setModalEditar(p => p ? { ...p, nombre: e.target.value } : p)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Apellido</label>
                <input type="text" value={modalEditar.apellido} onChange={e => setModalEditar(p => p ? { ...p, apellido: e.target.value } : p)} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Email</label>
              <input type="email" value={modalEditar.email} disabled
                style={{ ...inputStyle, opacity: .5, cursor: 'not-allowed' }} />
              <div style={{ fontSize: 10, color: t3, marginTop: 4 }}>Para cambiar el email ve a Supabase Auth directamente.</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Rol</label>
                <select value={modalEditar.rol} onChange={e => setModalEditar(p => p ? { ...p, rol: e.target.value } : p)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Tipo jornada</label>
                <select value={modalEditar.tipo} onChange={e => setModalEditar(p => p ? { ...p, tipo: e.target.value } : p)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="A">Tipo A — Staff</option>
                  <option value="B">Tipo B — Pasante</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Empresa / Departamento</label>
              <select value={modalEditar.empresa} onChange={e => setModalEditar(p => p ? { ...p, empresa: e.target.value } : p)}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                {EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Ubicacion</label>
              <input type="text" value={modalEditar.ubicacion} onChange={e => setModalEditar(p => p ? { ...p, ubicacion: e.target.value } : p)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>Color de avatar</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORES.map(c => (
                  <div key={c} onClick={() => setModalEditar(p => p ? { ...p, color: c } : p)}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: modalEditar.color === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalEditar(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans' }}>
                Cancelar
              </button>
              <button onClick={guardarEdicion} disabled={guardando} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#7C6FF7', color: 'white', fontSize: 13, fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? .7 : 1, fontFamily: 'DM Sans' }}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR */}
      {modalCrear && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800 }}>Crear nuevo usuario</div>
              <button onClick={() => setModalCrear(false)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Nombre *</label>
                <input type="text" value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario(p => ({ ...p, nombre: e.target.value }))} placeholder="Ariana" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Apellido *</label>
                <input type="text" value={nuevoUsuario.apellido} onChange={e => setNuevoUsuario(p => ({ ...p, apellido: e.target.value }))} placeholder="Sig-Tu" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Email * (corporativo o gmail para pasantes)</label>
              <input type="email" value={nuevoUsuario.email} onChange={e => setNuevoUsuario(p => ({ ...p, email: e.target.value }))} placeholder="usuario@eminat.net" style={inputStyle} />
              {nuevoUsuario.email && CARGOS_DIRECTORIO[nuevoUsuario.email.toLowerCase()] && (
                <div style={{ fontSize: 10, color: '#7C6FF7', marginTop: 4 }}>
                  Cargo detectado: {CARGOS_DIRECTORIO[nuevoUsuario.email.toLowerCase()]}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Contrasena temporal *</label>
              <input type="password" value={nuevoUsuario.password} onChange={e => setNuevoUsuario(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 caracteres" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Rol</label>
                <select value={nuevoUsuario.rol} onChange={e => setNuevoUsuario(p => ({ ...p, rol: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Tipo jornada</label>
                <select value={nuevoUsuario.tipo} onChange={e => setNuevoUsuario(p => ({ ...p, tipo: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="A">Tipo A — Staff</option>
                  <option value="B">Tipo B — Pasante</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Empresa / Departamento</label>
              <select value={nuevoUsuario.empresa} onChange={e => setNuevoUsuario(p => ({ ...p, empresa: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                {EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
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

      {/* MODAL ELIMINAR */}
      {modalEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Eliminar usuario</div>
            <div style={{ fontSize: 13, color: t2, marginBottom: 24, lineHeight: 1.5 }}>
              Esta accion es permanente. El usuario perdera todo acceso al sistema.
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
