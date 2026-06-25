'use client'
import { useState } from 'react'
import { useApp, COLORES_AVATAR } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { companyOptions } from '@/shared/constants/companies'
import { apiPost } from '@/shared/api'
import Modal from '@/shared/components/Modal'
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
  const { setAdminUsuarios, mostrarMensaje, border, t2, t3, accent, inputStyle, roles } = useApp()
  const { t } = useT()
  const [form, setForm] = useState<EditUserDraft>(user)
  const [editError, setEditError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardarEdicion() {
    setEditError(null)
    if (!form.nombre || !form.apellido || !form.email) { setEditError(t('admin.edit.fillRequired')); return }
    setGuardando(true)
    try {
      const { res, result } = await apiPost('/api/admin/update-user', {
        id: form.id, currentEmail: form.currentEmail, email: form.email, nombre: form.nombre, apellido: form.apellido,
        rol: form.rol, tipo: form.tipo, color: form.color, ubicacion: form.ubicacion, empresa: form.empresa, cargo: form.cargo,
      })
      if (!res.ok) { setEditError(result.error || t('admin.edit.failed')); setGuardando(false); return }
      setAdminUsuarios(prev => prev.map(u => u.id === form.id ? { ...u, ...result.user } : u))
      mostrarMensaje('ok', t('admin.edit.updated'))
      onClose()
    } catch (err: any) {
      setEditError(err.message || t('admin.edit.netErr'))
    }
    setGuardando(false)
  }

  return (
    <Modal title={t('admin.edit.title')} width={480} onClose={onClose}>
        <ErrorBlock msg={editError} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('common.firstName')}</label><input type="text" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} /></div>
          <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('common.lastName')}</label><input type="text" value={form.apellido} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))} style={inputStyle} /></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('admin.edit.emailLabel')}</label>
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
          {form.currentEmail && form.email && form.currentEmail.toLowerCase() !== form.email.toLowerCase() && (
            <div style={{ marginTop: 6, fontSize: 10, color: '#FBB040' }}>
              {t('admin.edit.emailChangeWarn')}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('common.role')}</label><select value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))} style={inputStyle}>{roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}</select></div>
          <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('common.type')}</label><select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}><option value="A">{t('admin.typeA')}</option><option value="B">{t('admin.typeB')}</option></select></div>
        </div>
        <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('admin.cargoTitle')}</label><input type="text" value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} placeholder={t('admin.cargoPlaceholder')} style={inputStyle} /></div>
        <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('common.company')}</label><select value={form.empresa} onChange={e => setForm(p => ({ ...p, empresa: e.target.value }))} style={inputStyle}>{companyOptions(form.empresa).map(e => <option key={e} value={e}>{e}</option>)}</select></div>
        <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('common.location')}</label><input type="text" value={form.ubicacion} onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))} style={inputStyle} /></div>
        <div style={{ marginBottom: 20 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>{t('common.avatarColor')}</label><div style={{ display: 'flex', gap: 8 }}>{COLORES_AVATAR.map(c => <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />)}</div></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>{t('common.cancel')}</button>
          <button onClick={guardarEdicion} disabled={guardando} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardando ? t('common.saving') : t('common.saveChanges')}</button>
        </div>
    </Modal>
  )
}
