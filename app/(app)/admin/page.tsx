'use client'
import { useState } from 'react'
import { useApp, ROLES, EMPRESAS, EMPRESA_COLORS, COLORES_AVATAR, CARGOS_DIR } from '@/lib/AppContext'
import AppShell from '@/app/components/AppShell'
import { supabase } from '@/lib/supabase'
import { PageTransition, StaggerGrid, StaggerItem, AnimatedNumber } from '@/lib/motion'

// ── Password helpers ──────────────────────────────────────────────────────
// Strong temp password using crypto.getRandomValues. Excludes ambiguous
// characters (0/O, 1/l/I) so admins can read it aloud without confusion.
function generateTempPassword(length = 14): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const symbols = '!@#$%&*'
  const all = lower + upper + digits + symbols
  const rand = new Uint32Array(length)
  crypto.getRandomValues(rand)
  // Guarantee at least one of each class.
  const chars: string[] = [
    lower[rand[0] % lower.length],
    upper[rand[1] % upper.length],
    digits[rand[2] % digits.length],
    symbols[rand[3] % symbols.length],
  ]
  for (let i = 4; i < length; i++) chars.push(all[rand[i] % all.length])
  // Crypto-backed shuffle so the guaranteed-class chars aren't stuck at the front.
  const shuffleSeed = new Uint32Array(chars.length)
  crypto.getRandomValues(shuffleSeed)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleSeed[i] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function AdminPage() {
  const { esSuperAdmin, adminUsuarios, setAdminUsuarios, s1, s2, border, t1, t2, t3, accent, inputStyle, mostrarMensaje } = useApp()
  const [busquedaAdmin, setBusquedaAdmin] = useState('')
  const [filtroRolAdmin, setFiltroRolAdmin] = useState('todos')
  const [guardandoAdmin, setGuardandoAdmin] = useState(false)

  // Create modal
  const DEFAULT_NEW = { nombre: '', apellido: '', email: '', password: '', rol: 'stratix360', tipo: 'B', color: '#7C6FF7', empresa: 'Eminat Group' }
  const [modalCrear, setModalCrear] = useState(false)
  const [nuevoUsr, setNuevoUsr] = useState(DEFAULT_NEW)
  const [showCreatePwd, setShowCreatePwd] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<{ pwd: string; nombre: string; email: string } | null>(null)

  // Edit modal
  const [modalEditar, setModalEditar] = useState<any>(null)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete modal
  const [modalEliminar, setModalEliminar] = useState<string | null>(null)

  // Reset password modal
  type ResetTarget = { id: string; nombre: string; email: string }
  const [modalReset, setModalReset] = useState<ResetTarget | null>(null)
  const [resetPwd, setResetPwd] = useState('')
  const [showResetPwd, setShowResetPwd] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<{ pwd: string; nombre: string } | null>(null)

  const adminFiltrado = adminUsuarios.filter(u => {
    if (filtroRolAdmin !== 'todos' && u.rol !== filtroRolAdmin) return false
    if (busquedaAdmin) { const q = busquedaAdmin.toLowerCase(); return (u.nombre || '').toLowerCase().includes(q) || (u.apellido || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) }
    return true
  })

  async function cambiarRol(id: string, rol: string) {
    const { error } = await supabase.from('usuarios').update({ rol }).eq('id', id)
    if (error) { mostrarMensaje('error', `Role: ${error.message}`); return }
    setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, rol } : u))
    mostrarMensaje('ok', 'Role updated')
  }
  async function toggleActivo(id: string, activo: boolean) {
    await supabase.from('usuarios').update({ activo: !activo }).eq('id', id)
    setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: !activo } : u))
    mostrarMensaje('ok', !activo ? 'User activated' : 'User deactivated')
  }
  async function validarUsuario(id: string) {
    await supabase.from('usuarios').update({ validado: true, activo: true }).eq('id', id)
    setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, validado: true, activo: true } : u))
    mostrarMensaje('ok', 'User validated')
  }
  async function eliminarUsuario(id: string) {
    await supabase.from('usuarios').delete().eq('id', id)
    setAdminUsuarios(prev => prev.filter(u => u.id !== id))
    setModalEliminar(null)
    mostrarMensaje('ok', 'User deleted')
  }

  function openResetModal(target: ResetTarget) {
    setResetError(null)
    setResetSuccess(null)
    setResetPwd(generateTempPassword())
    setShowResetPwd(true)
    setModalReset(target)
  }
  async function ejecutarReset() {
    if (!modalReset) return
    if (resetPwd.length < 8) { setResetError('La contraseña debe tener al menos 8 caracteres.'); return }
    setGuardandoAdmin(true)
    setResetError(null)
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: modalReset.id, password: resetPwd }),
      })
      const result = await res.json()
      if (!res.ok) {
        setResetError(result.error || 'No se pudo actualizar la contraseña.')
        setGuardandoAdmin(false)
        return
      }
      setResetSuccess({ pwd: resetPwd, nombre: modalReset.nombre })
    } catch (err: any) {
      setResetError(err.message || 'Error de red al actualizar la contraseña.')
    }
    setGuardandoAdmin(false)
  }

  async function crearUsuario() {
    setCreateError(null)
    if (!nuevoUsr.nombre || !nuevoUsr.apellido || !nuevoUsr.email || !nuevoUsr.password) {
      setCreateError('Por favor completa todos los campos requeridos.'); return
    }
    if (nuevoUsr.password.length < 8) { setCreateError('La contraseña debe tener al menos 8 caracteres.'); return }
    setGuardandoAdmin(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: nuevoUsr.email,
          password: nuevoUsr.password,
          nombre: nuevoUsr.nombre,
          apellido: nuevoUsr.apellido,
          rol: nuevoUsr.rol,
          tipo: nuevoUsr.tipo,
          color: nuevoUsr.color,
          empresa: nuevoUsr.empresa,
          ubicacion: 'Guayaquil, Ecuador',
          cargo: CARGOS_DIR[nuevoUsr.email.toLowerCase()] || '',
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setCreateError(result.error || 'No se pudo crear el usuario.')
        setGuardandoAdmin(false)
        return
      }
      // Success — flip the modal to the credentials panel and refresh the list.
      setCreateSuccess({ pwd: nuevoUsr.password, nombre: `${nuevoUsr.nombre} ${nuevoUsr.apellido}`, email: nuevoUsr.email })
      const { data } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false })
      setAdminUsuarios((data || []).map(u => ({ ...u, cargo: u.cargo || CARGOS_DIR[u.email?.toLowerCase()] || '' })))
    } catch (err: any) {
      setCreateError(err.message || 'Error de red al crear el usuario.')
    }
    setGuardandoAdmin(false)
  }

  function closeCreateModal() {
    setModalCrear(false)
    setNuevoUsr(DEFAULT_NEW)
    setCreateError(null)
    setCreateSuccess(null)
    setShowCreatePwd(false)
  }

  async function guardarEdicion() {
    if (!modalEditar) return
    setEditError(null)
    if (!modalEditar.nombre || !modalEditar.apellido || !modalEditar.email) {
      setEditError('Por favor completa nombre, apellido y email.'); return
    }
    setGuardandoAdmin(true)
    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: modalEditar.id,
          currentEmail: modalEditar.currentEmail,
          email: modalEditar.email,
          nombre: modalEditar.nombre,
          apellido: modalEditar.apellido,
          rol: modalEditar.rol,
          tipo: modalEditar.tipo,
          color: modalEditar.color,
          ubicacion: modalEditar.ubicacion,
          empresa: modalEditar.empresa,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setEditError(result.error || 'No se pudo actualizar el usuario.')
        setGuardandoAdmin(false)
        return
      }
      setAdminUsuarios(prev => prev.map(u => u.id === modalEditar.id ? { ...u, ...result.user } : u))
      mostrarMensaje('ok', 'User updated')
      setModalEditar(null)
    } catch (err: any) {
      setEditError(err.message || 'Error de red al actualizar el usuario.')
    }
    setGuardandoAdmin(false)
  }

  if (!esSuperAdmin) return <AppShell><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}><div style={{ fontSize: 48 }}>🔒</div><div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Access denied</div></div></AppShell>

  const crearBtn = <button onClick={() => { setModalCrear(true); setNuevoUsr(DEFAULT_NEW); setCreateError(null); setCreateSuccess(null) }} style={{ padding: '7px 16px', borderRadius: 10, background: '#F87171', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>+ New user</button>

  // ── Small reusable controls for password inputs ─────────────────────────
  const pwdInputControls = (value: string, onChange: (v: string) => void, show: boolean, setShow: (v: boolean) => void) => (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, paddingRight: 92, fontFamily: 'DM Mono, monospace' }}
        placeholder="Min. 8 caracteres"
      />
      <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
        <button type="button" onClick={() => setShow(!show)} title={show ? 'Ocultar' : 'Mostrar'} style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>{show ? '🙈' : '👁'}</button>
        <button type="button" onClick={async () => { if (await copyToClipboard(value)) mostrarMensaje('ok', 'Contraseña copiada') }} title="Copiar" style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>📋</button>
        <button type="button" onClick={() => { onChange(generateTempPassword()); setShow(true) }} title="Generar nueva" style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>🎲</button>
      </div>
    </div>
  )

  // Big "share this password" panel reused by Create-success and Reset-success.
  const credentialsPanel = (label: string, name: string, email: string | null, pwd: string, onClose: () => void) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(52,211,153,.10)', border: '1px solid rgba(52,211,153,.35)', borderRadius: 12 }}>
        <div style={{ fontSize: 20 }}>✓</div>
        <div style={{ fontSize: 13, color: t1, fontWeight: 600 }}>{label}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: t3, marginBottom: 5 }}>Usuario</div>
        <div style={{ fontSize: 14, color: t1, fontWeight: 600 }}>{name}</div>
        {email && <div style={{ fontSize: 11, color: t3, fontFamily: 'DM Mono', marginTop: 2 }}>{email}</div>}
      </div>
      <div>
        <div style={{ fontSize: 11, color: t3, marginBottom: 5 }}>Contraseña</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <code style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: s2, border: `1px solid ${border}`, fontFamily: 'DM Mono, monospace', fontSize: 15, color: t1, letterSpacing: '.04em', userSelect: 'all' }}>{pwd}</code>
          <button onClick={async () => { if (await copyToClipboard(pwd)) mostrarMensaje('ok', 'Contraseña copiada') }} style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>📋 Copiar</button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: t2, lineHeight: 1.5, padding: '10px 14px', borderRadius: 10, background: 'rgba(96,165,250,.08)', border: '1px solid rgba(96,165,250,.25)' }}>
        Entrégasela al usuario en un canal privado. La cambiará en su primer inicio de sesión.
      </div>
      <button onClick={onClose} style={{ padding: '10px', borderRadius: 10, border: 'none', background: accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Listo</button>
    </div>
  )

  const errorBlock = (msg: string | null) => msg ? (
    <div style={{ padding: '10px 14px', marginBottom: 14, borderRadius: 10, background: 'rgba(248,113,113,.10)', border: '1px solid rgba(248,113,113,.35)', color: '#F87171', fontSize: 12, lineHeight: 1.5 }}>
      {msg}
    </div>
  ) : null

  return (
    <AppShell actions={crearBtn}>
      <PageTransition>
        <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[{ label: 'Total usuarios', value: adminUsuarios.length, color: accent }, { label: 'Activos', value: adminUsuarios.filter(u => u.activo && u.validado).length, color: '#34D399' }, { label: 'Pendientes', value: adminUsuarios.filter(u => !u.validado).length, color: '#FBB040' }, { label: 'Stratix 360', value: adminUsuarios.filter(u => u.rol === 'stratix360').length, color: '#60A5FA' }].map(s => (
            <StaggerItem key={s.label} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, color: s.color }}><AnimatedNumber value={s.value} /></div>
              <div style={{ fontSize: 11, color: t3, marginTop: 4 }}>{s.label}</div>
            </StaggerItem>
          ))}
        </StaggerGrid>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Search..." value={busquedaAdmin} onChange={e => setBusquedaAdmin(e.target.value)} style={{ ...inputStyle, width: 220 }} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['todos', ...ROLES].map(r => (
              <button key={r} onClick={() => setFiltroRolAdmin(r)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, border: `1px solid ${filtroRolAdmin === r ? '#F87171' : border}`, background: filtroRolAdmin === r ? 'rgba(248,113,113,.15)' : 'transparent', color: filtroRolAdmin === r ? '#F87171' : t2, cursor: 'pointer' }}>{r}</button>
            ))}
          </div>
        </div>
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: s2 }}>
                {['User', 'Email', 'Role Title', 'Company', 'Access', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>{h}</th>)}
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
                      <button onClick={() => { setEditError(null); setModalEditar({ id: u.id, nombre: u.nombre || '', apellido: u.apellido || '', email: u.email || '', currentEmail: u.email || '', rol: u.rol || 'stratix360', tipo: u.tipo || 'B', color: u.color || '#7C6FF7', ubicacion: u.ubicacion || 'Guayaquil, Ecuador', empresa: u.empresa || 'Eminat Group' }) }} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(124,111,247,.3)', background: 'transparent', color: '#7C6FF7', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => openResetModal({ id: u.id, nombre: u.nombre, email: u.email })} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(96,165,250,.3)', background: 'transparent', color: '#60A5FA', cursor: 'pointer' }}>Reset pwd</button>
                      {!u.validado && <button onClick={() => validarUsuario(u.id)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(52,211,153,.3)', background: 'transparent', color: '#34D399', cursor: 'pointer' }}>Validate</button>}
                      {u.rol !== 'superadmin' && <button onClick={() => toggleActivo(u.id, u.activo)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(251,176,64,.3)', background: 'transparent', color: '#FBB040', cursor: 'pointer' }}>{u.activo ? 'Deactivate' : 'Activate'}</button>}
                      {u.rol !== 'superadmin' && <button onClick={() => setModalEliminar(u.id)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: '1px solid rgba(248,113,113,.3)', background: 'transparent', color: '#F87171', cursor: 'pointer' }}>Delete</button>}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Edit user</div><button onClick={() => setModalEditar(null)} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button></div>
            {errorBlock(editError)}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>First name</label><input type="text" value={modalEditar.nombre} onChange={e => setModalEditar((p: any) => ({ ...p, nombre: e.target.value }))} style={inputStyle} /></div>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Last name</label><input type="text" value={modalEditar.apellido} onChange={e => setModalEditar((p: any) => ({ ...p, apellido: e.target.value }))} style={inputStyle} /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Email (login identity)</label>
              <input type="email" value={modalEditar.email} onChange={e => setModalEditar((p: any) => ({ ...p, email: e.target.value }))} style={inputStyle} />
              {modalEditar.currentEmail && modalEditar.email && modalEditar.currentEmail.toLowerCase() !== modalEditar.email.toLowerCase() && (
                <div style={{ marginTop: 6, fontSize: 10, color: '#FBB040' }}>
                  Cambiar el email actualiza la cuenta de Auth y el row de usuarios en una sola operación. Si una de las dos partes falla, se revierte la otra.
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Role</label><select value={modalEditar.rol} onChange={e => setModalEditar((p: any) => ({ ...p, rol: e.target.value }))} style={inputStyle}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Type</label><select value={modalEditar.tipo} onChange={e => setModalEditar((p: any) => ({ ...p, tipo: e.target.value }))} style={inputStyle}><option value="A">Tipo A — Staff</option><option value="B">Tipo B — Pasante</option></select></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Company</label><select value={modalEditar.empresa} onChange={e => setModalEditar((p: any) => ({ ...p, empresa: e.target.value }))} style={inputStyle}>{EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Location</label><input type="text" value={modalEditar.ubicacion} onChange={e => setModalEditar((p: any) => ({ ...p, ubicacion: e.target.value }))} style={inputStyle} /></div>
            <div style={{ marginBottom: 20 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>Avatar color</label><div style={{ display: 'flex', gap: 8 }}>{COLORES_AVATAR.map(c => <div key={c} onClick={() => setModalEditar((p: any) => ({ ...p, color: c }))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: modalEditar.color === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />)}</div></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalEditar(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={guardarEdicion} disabled={guardandoAdmin} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardandoAdmin ? 'Saving...' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR */}
      {modalCrear && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>{createSuccess ? 'Usuario creado' : 'Create user'}</div>
              <button onClick={closeCreateModal} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            {createSuccess ? (
              credentialsPanel(
                `${createSuccess.nombre} creado correctamente`,
                createSuccess.nombre,
                createSuccess.email,
                createSuccess.pwd,
                closeCreateModal,
              )
            ) : (
              <>
                {errorBlock(createError)}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Nombre *</label><input type="text" value={nuevoUsr.nombre} onChange={e => setNuevoUsr(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Last name *</label><input type="text" value={nuevoUsr.apellido} onChange={e => setNuevoUsr(p => ({ ...p, apellido: e.target.value }))} style={inputStyle} /></div>
                </div>
                <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Email *</label><input type="email" value={nuevoUsr.email} onChange={e => setNuevoUsr(p => ({ ...p, email: e.target.value }))} placeholder="usuario@eminat.net" style={inputStyle} /></div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <label style={{ fontSize: 11, color: t3 }}>Contraseña temporal *</label>
                    <button type="button" onClick={() => { setNuevoUsr(p => ({ ...p, password: generateTempPassword() })); setShowCreatePwd(true) }} style={{ padding: '3px 10px', fontSize: 10, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: accent, cursor: 'pointer' }}>🎲 Generar contraseña</button>
                  </div>
                  {pwdInputControls(nuevoUsr.password, v => setNuevoUsr(p => ({ ...p, password: v })), showCreatePwd, setShowCreatePwd)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Role</label><select value={nuevoUsr.rol} onChange={e => setNuevoUsr(p => ({ ...p, rol: e.target.value }))} style={inputStyle}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Type</label><select value={nuevoUsr.tipo} onChange={e => setNuevoUsr(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}><option value="A">Tipo A — Staff</option><option value="B">Tipo B — Pasante</option></select></div>
                </div>
                <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Company</label><select value={nuevoUsr.empresa} onChange={e => setNuevoUsr(p => ({ ...p, empresa: e.target.value }))} style={inputStyle}>{EMPRESAS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                <div style={{ marginBottom: 20 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>Avatar color</label><div style={{ display: 'flex', gap: 8 }}>{COLORES_AVATAR.map(c => <div key={c} onClick={() => setNuevoUsr(p => ({ ...p, color: c }))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: nuevoUsr.color === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />)}</div></div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeCreateModal} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={crearUsuario} disabled={guardandoAdmin} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#F87171', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardandoAdmin ? 'Creating...' : 'Create user'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL RESET PASSWORD */}
      {modalReset && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 460, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>{resetSuccess ? 'Contraseña actualizada' : 'Reset password'}</div>
              <button onClick={() => { setModalReset(null); setResetSuccess(null); setResetError(null) }} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            {resetSuccess ? (
              credentialsPanel(
                `Nueva contraseña para ${resetSuccess.nombre}`,
                resetSuccess.nombre,
                null,
                resetSuccess.pwd,
                () => { setModalReset(null); setResetSuccess(null) },
              )
            ) : (
              <>
                {errorBlock(resetError)}
                <div style={{ fontSize: 12, color: t2, marginBottom: 14, lineHeight: 1.5 }}>
                  Vas a establecer una nueva contraseña para <strong style={{ color: t1 }}>{modalReset.nombre}</strong> ({modalReset.email}). No podemos ver la contraseña anterior — esta la reemplaza por completo y te la mostramos para que se la entregues.
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Nueva contraseña</label>
                  {pwdInputControls(resetPwd, setResetPwd, showResetPwd, setShowResetPwd)}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setModalReset(null); setResetError(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={ejecutarReset} disabled={guardandoAdmin} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#60A5FA', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardandoAdmin ? 'Updating...' : 'Set new password'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {modalEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: t1, marginBottom: 8 }}>Delete user</div>
            <div style={{ fontSize: 13, color: t2, marginBottom: 24, lineHeight: 1.5 }}>This action is permanent and cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalEliminar(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => eliminarUsuario(modalEliminar)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#F87171', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      </PageTransition>
    </AppShell>
  )
}
