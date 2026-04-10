'use client'
import { useState } from 'react'
import { useApp, ROLES, EMPRESAS, EMPRESA_COLORS, COLORES_AVATAR, CARGOS_DIR } from '@/lib/AppContext'
import AppShell from '@/app/components/AppShell'
import { supabase } from '@/lib/supabase'
import { PageTransition, StaggerGrid, StaggerItem, AnimatedNumber } from '@/lib/motion'

export default function AdminPage() {
  const { esSuperAdmin, adminUsuarios, setAdminUsuarios, s1, s2, border, t1, t2, t3, accent, inputStyle, mostrarMensaje } = useApp()
  const [busquedaAdmin, setBusquedaAdmin] = useState('')
  const [filtroRolAdmin, setFiltroRolAdmin] = useState('todos')
  const [guardandoAdmin, setGuardandoAdmin] = useState(false)
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEditar, setModalEditar] = useState<any>(null)
  const [modalEliminar, setModalEliminar] = useState<string | null>(null)
  const [nuevoUsr, setNuevoUsr] = useState({ nombre: '', apellido: '', email: '', password: '', rol: 'pasante', tipo: 'B', color: '#7C6FF7', empresa: 'Eminat Holding' })

  const adminFiltrado = adminUsuarios.filter(u => {
    if (filtroRolAdmin !== 'todos' && u.rol !== filtroRolAdmin) return false
    if (busquedaAdmin) { const q = busquedaAdmin.toLowerCase(); return (u.nombre || '').toLowerCase().includes(q) || (u.apellido || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) }
    return true
  })

  async function cambiarRol(id: string, rol: string) { await supabase.from('usuarios').update({ rol }).eq('id', id); setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, rol } : u)); mostrarMensaje('ok', 'Rol actualizado') }
  async function toggleActivo(id: string, activo: boolean) { await supabase.from('usuarios').update({ activo: !activo }).eq('id', id); setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: !activo } : u)); mostrarMensaje('ok', !activo ? 'Usuario activado' : 'Usuario desactivado') }
  async function validarUsuario(id: string) { await supabase.from('usuarios').update({ validado: true, activo: true }).eq('id', id); setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, validado: true, activo: true } : u)); mostrarMensaje('ok', 'Usuario validado') }
  async function eliminarUsuario(id: string) { await supabase.from('usuarios').delete().eq('id', id); setAdminUsuarios(prev => prev.filter(u => u.id !== id)); setModalEliminar(null); mostrarMensaje('ok', 'Usuario eliminado') }
  async function resetPassword(email: string, nombre: string) { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); if (error) mostrarMensaje('error', 'Error al enviar el email'); else mostrarMensaje('ok', `Email enviado a ${nombre}`) }
  async function crearUsuario() {
    if (!nuevoUsr.nombre || !nuevoUsr.apellido || !nuevoUsr.email || !nuevoUsr.password) { mostrarMensaje('error', 'Completa todos los campos'); return }
    setGuardandoAdmin(true)
    const { data: signUpData, error } = await supabase.auth.signUp({ email: nuevoUsr.email, password: nuevoUsr.password })
    if (error) { mostrarMensaje('error', error.message); setGuardandoAdmin(false); return }
    const uid = signUpData?.user?.id
    if (uid) await supabase.from('usuarios').upsert({ id: uid, nombre: nuevoUsr.nombre, apellido: nuevoUsr.apellido, email: nuevoUsr.email, rol: nuevoUsr.rol, tipo: nuevoUsr.tipo, color: nuevoUsr.color, empresa: nuevoUsr.empresa, cargo: CARGOS_DIR[nuevoUsr.email.toLowerCase()] || '', activo: true, validado: true, ubicacion: 'Guayaquil, Ecuador' })
    mostrarMensaje('ok', `Usuario ${nuevoUsr.nombre} creado`)
    setModalCrear(false); setNuevoUsr({ nombre: '', apellido: '', email: '', password: '', rol: 'pasante', tipo: 'B', color: '#7C6FF7', empresa: 'Eminat Holding' })
    const { data } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false })
    setAdminUsuarios((data || []).map(u => ({ ...u, cargo: u.cargo || CARGOS_DIR[u.email?.toLowerCase()] || '' }))); setGuardandoAdmin(false)
  }
  async function guardarEdicion() {
    if (!modalEditar) return; setGuardandoAdmin(true)
    await supabase.from('usuarios').update({ nombre: modalEditar.nombre, apellido: modalEditar.apellido, rol: modalEditar.rol, tipo: modalEditar.tipo, color: modalEditar.color, ubicacion: modalEditar.ubicacion, empresa: modalEditar.empresa }).eq('id', modalEditar.id)
    setAdminUsuarios(prev => prev.map(u => u.id === modalEditar.id ? { ...u, ...modalEditar } : u)); mostrarMensaje('ok', 'Usuario actualizado'); setModalEditar(null); setGuardandoAdmin(false)
  }

  if (!esSuperAdmin) return <AppShell><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}><div style={{ fontSize: 48 }}>🔒</div><div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Sin permisos</div></div></AppShell>

  const crearBtn = <button onClick={() => setModalCrear(true)} style={{ padding: '7px 16px', borderRadius: 10, background: '#F87171', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>+ Crear usuario</button>

  return (
    <AppShell actions={crearBtn}>
      <PageTransition>
        <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[{ label: 'Total usuarios', value: adminUsuarios.length, color: accent }, { label: 'Activos', value: adminUsuarios.filter(u => u.activo && u.validado).length, color: '#34D399' }, { label: 'Pendientes', value: adminUsuarios.filter(u => !u.validado).length, color: '#FBB040' }, { label: 'Pasantes', value: adminUsuarios.filter(u => u.rol === 'pasante').length, color: '#60A5FA' }].map(s => (
            <StaggerItem key={s.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, color: s.color }}><AnimatedNumber value={s.value} /></div>
              <div style={{ fontSize: 11, color: t3, marginTop: 4 }}>{s.label}</div>
            </StaggerItem>
          ))}
        </StaggerGrid>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Buscar..." value={busquedaAdmin} onChange={e => setBusquedaAdmin(e.target.value)} style={{ ...inputStyle, width: 220 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {['todos', ...ROLES].map(r => (
              <button key={r} onClick={() => setFiltroRolAdmin(r)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${filtroRolAdmin === r ? '#F87171' : border}`, background: filtroRolAdmin === r ? 'rgba(248,113,113,.15)' : 'transparent', color: filtroRolAdmin === r ? '#F87171' : t2, cursor: 'pointer' }}>{r}</button>
            ))}
          </div>
        </div>
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: s2 }}>
                {['Usuario', 'Email', 'Cargo', 'Empresa', 'Rol', 'Estado', 'Acciones'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>)}
              </tr></thead>
              <tbody>{adminFiltrado.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${border}` }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>{u.nombre?.[0]}{u.apellido?.[0]}</div>
                      <div><div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>{u.nombre} {u.apellido}</div><div style={{ fontSize: 9, color: t3 }}>Tipo {u.tipo || 'B'} · {u.ubicacion || 'Ecuador'}</div></div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{u.email}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: t2 }}>{u.cargo || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>{u.empresa ? <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: `${EMPRESA_COLORS[u.empresa] || accent}20`, color: EMPRESA_COLORS[u.empresa] || accent }}>{u.empresa.replace('Eminat ', '').replace(' by Eminat', '')}</span> : <span style={{ fontSize: 10, color: t3 }}>—</span>}</td>
                  <td style={{ padding: '10px 14px' }}>{u.rol === 'superadmin' ? <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(248,113,113,.12)', color: '#F87171' }}>superadmin</span> : <select value={u.rol} onChange={e => cambiarRol(u.id, e.target.value)} style={{ padding: '3px 8px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', outline: 'none' }}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>}</td>
                  <td style={{ padding: '10px 14px' }}>{u.validado && u.activo ? <span style={{ fontSize: 11, color: '#34D399' }}>● Activo</span> : !u.validado ? <span style={{ fontSize: 11, color: '#FBB040' }}>Pendiente</span> : <span style={{ fontSize: 11, color: '#F87171' }}>Inactivo</span>}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button onClick={() => setModalEditar({ id: u.id, nombre: u.nombre || '', apellido: u.apellido || '', email: u.email || '', rol: u.rol || 'pasante', tipo: u.tipo || 'B', color: u.color || '#7C6FF7', ubicacion: u.ubicacion || 'Guayaquil, Ecuador', empresa: u.empresa || 'Eminat Holding' })} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(124,111,247,.3)', background: 'transparent', color: '#7C6FF7', cursor: 'pointer' }}>Editar</button>
                      <button onClick={() => resetPassword(u.email, u.nombre)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(96,165,250,.3)', background: 'transparent', color: '#60A5FA', cursor: 'pointer' }}>Reset pwd</button>
                      {!u.validado && <button onClick={() => validarUsuario(u.id)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(52,211,153,.3)', background: 'transparent', color: '#34D399', cursor: 'pointer' }}>Validar</button>}
                      {u.rol !== 'superadmin' && <button onClick={() => toggleActivo(u.id, u.activo)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(251,176,64,.3)', background: 'transparent', color: '#FBB040', cursor: 'pointer' }}>{u.activo ? 'Desactivar' : 'Activar'}</button>}
                      {u.rol !== 'superadmin' && <button onClick={() => setModalEliminar(u.id)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(248,113,113,.3)', background: 'transparent', color: '#F87171', cursor: 'pointer' }}>Eliminar</button>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

      {/* MODAL EDITAR */}
      {modalEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Editar usuario</div><button onClick={() => setModalEditar(null)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Nombre</label><input type="text" value={modalEditar.nombre} onChange={e => setModalEditar((p: any) => ({ ...p, nombre: e.target.value }))} style={inputStyle} /></div>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Apellido</label><input type="text" value={modalEditar.apellido} onChange={e => setModalEditar((p: any) => ({ ...p, apellido: e.target.value }))} style={inputStyle} /></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Email (solo lectura)</label><input type="email" value={modalEditar.email} disabled style={{ ...inputStyle, opacity: .4 }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Rol</label><select value={modalEditar.rol} onChange={e => setModalEditar((p: any) => ({ ...p, rol: e.target.value }))} style={inputStyle}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Tipo</label><select value={modalEditar.tipo} onChange={e => setModalEditar((p: any) => ({ ...p, tipo: e.target.value }))} style={inputStyle}><option value="A">Tipo A — Staff</option><option value="B">Tipo B — Pasante</option></select></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Empresa</label><select value={modalEditar.empresa} onChange={e => setModalEditar((p: any) => ({ ...p, empresa: e.target.value }))} style={inputStyle}>{EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Ubicacion</label><input type="text" value={modalEditar.ubicacion} onChange={e => setModalEditar((p: any) => ({ ...p, ubicacion: e.target.value }))} style={inputStyle} /></div>
            <div style={{ marginBottom: 20 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>Color de avatar</label><div style={{ display: 'flex', gap: 8 }}>{COLORES_AVATAR.map(c => <div key={c} onClick={() => setModalEditar((p: any) => ({ ...p, color: c }))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: modalEditar.color === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />)}</div></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalEditar(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarEdicion} disabled={guardandoAdmin} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardandoAdmin ? 'Guardando...' : 'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR */}
      {modalCrear && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Crear usuario</div><button onClick={() => setModalCrear(false)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Nombre *</label><input type="text" value={nuevoUsr.nombre} onChange={e => setNuevoUsr(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} /></div>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Apellido *</label><input type="text" value={nuevoUsr.apellido} onChange={e => setNuevoUsr(p => ({ ...p, apellido: e.target.value }))} style={inputStyle} /></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Email *</label><input type="email" value={nuevoUsr.email} onChange={e => setNuevoUsr(p => ({ ...p, email: e.target.value }))} placeholder="usuario@eminat.net" style={inputStyle} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Contrasena temporal *</label><input type="password" value={nuevoUsr.password} onChange={e => setNuevoUsr(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 caracteres" style={inputStyle} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Rol</label><select value={nuevoUsr.rol} onChange={e => setNuevoUsr(p => ({ ...p, rol: e.target.value }))} style={inputStyle}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Tipo</label><select value={nuevoUsr.tipo} onChange={e => setNuevoUsr(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}><option value="A">Tipo A — Staff</option><option value="B">Tipo B — Pasante</option></select></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Empresa</label><select value={nuevoUsr.empresa} onChange={e => setNuevoUsr(p => ({ ...p, empresa: e.target.value }))} style={inputStyle}>{EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div style={{ marginBottom: 20 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>Color de avatar</label><div style={{ display: 'flex', gap: 8 }}>{COLORES_AVATAR.map(c => <div key={c} onClick={() => setNuevoUsr(p => ({ ...p, color: c }))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: nuevoUsr.color === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />)}</div></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalCrear(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={crearUsuario} disabled={guardandoAdmin} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#F87171', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardandoAdmin ? 'Creando...' : 'Crear usuario'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {modalEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: t1, marginBottom: 8 }}>Eliminar usuario</div>
            <div style={{ fontSize: 13, color: t2, marginBottom: 24, lineHeight: 1.5 }}>Esta accion es permanente y no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalEliminar(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => eliminarUsuario(modalEliminar)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#F87171', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
      </PageTransition>
    </AppShell>
  )
}
