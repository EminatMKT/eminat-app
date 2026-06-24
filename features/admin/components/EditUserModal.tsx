'use client'
import { useState } from 'react'
import { useApp, COLORES_AVATAR } from '@/shared/context/AppContext'
import { companyOptions } from '@/shared/constants/companies'
import { apiPost } from '@/shared/api'
import ErrorBlock from './ErrorBlock'

export type EditUserDraft = {
  id: string
  nombre: string
  apellido: string
  email: string
  currentEmail: string
  rol: string
  tipo: string
  color: string
  ubicacion: string
  empresa: string
  cargo: string
}

export default function EditUserModal({ user, onClose }: { user: EditUserDraft; onClose: () => void }) {
  const { setAdminUsuarios, mostrarMensaje, s1, border, t1, t2, t3, accent, inputStyle, roles } = useApp()
  const [form, setForm] = useState<EditUserDraft>(user)
  const [editError, setEditError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardarEdicion() {
    setEditError(null)
    if (!form.nombre || !form.apellido || !form.email) { setEditError('Por favor completa nombre, apellido y email.'); return }
    setGuardando(true)
    try {
      const { res, result } = await apiPost('/api/admin/update-user', {
        id: form.id, currentEmail: form.currentEmail, email: form.email, nombre: form.nombre, apellido: form.apellido,
        rol: form.rol, tipo: form.tipo, color: form.color, ubicacion: form.ubicacion, empresa: form.empresa, cargo: form.cargo,
      })
      if (!res.ok) { setEditError(result.error || 'No se pudo actualizar el usuario.'); setGuardando(false); return }
      setAdminUsuarios(prev => prev.map(u => u.id === form.id ? { ...u, ...result.user } : u))
      mostrarMensaje('ok', 'User updated')
      onClose()
    } catch (err: any) {
      setEditError(err.message || 'Error de red al actualizar el usuario.')
    }
    setGuardando(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Edit user</div><button onClick={onClose} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button></div>
        <ErrorBlock msg={editError} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>First name</label><input type="text" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} /></div>
          <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Last name</label><input type="text" value={form.apellido} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))} style={inputStyle} /></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Email (login identity)</label>
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
          {form.currentEmail && form.email && form.currentEmail.toLowerCase() !== form.email.toLowerCase() && (
            <div style={{ marginTop: 6, fontSize: 10, color: '#FBB040' }}>
              Cambiar el email actualiza la cuenta de Auth y el row de usuarios en una sola operación. Si una de las dos partes falla, se revierte la otra.
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Role</label><select value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))} style={inputStyle}>{roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}</select></div>
          <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Type</label><select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}><option value="A">Tipo A — Staff</option><option value="B">Tipo B — Pasante</option></select></div>
        </div>
        <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Cargo (Role Title)</label><input type="text" value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} placeholder="Ej. Lead Designer (opcional)" style={inputStyle} /></div>
        <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Company</label><select value={form.empresa} onChange={e => setForm(p => ({ ...p, empresa: e.target.value }))} style={inputStyle}>{companyOptions(form.empresa).map(e => <option key={e} value={e}>{e}</option>)}</select></div>
        <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Location</label><input type="text" value={form.ubicacion} onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))} style={inputStyle} /></div>
        <div style={{ marginBottom: 20 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>Avatar color</label><div style={{ display: 'flex', gap: 8 }}>{COLORES_AVATAR.map(c => <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />)}</div></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={guardarEdicion} disabled={guardando} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardando ? 'Saving...' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  )
}
