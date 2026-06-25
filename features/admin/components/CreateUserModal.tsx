'use client'
import { useState } from 'react'
import { useApp, COLORES_AVATAR, CARGOS_DIR } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { DEFAULT_ROLE } from '@/shared/auth/permissions'
import { DEFAULT_COMPANY, companyOptions } from '@/shared/constants/companies'
import { usuariosRepo } from '@/shared/data'
import { apiPost } from '@/shared/api'
import Modal from '@/shared/components/Modal'
import { generateTempPassword } from '../password'
import PasswordInput from './PasswordInput'
import CredentialsPanel from './CredentialsPanel'
import ErrorBlock from './ErrorBlock'

const DEFAULT_NEW = { nombre: '', apellido: '', email: '', password: '', rol: DEFAULT_ROLE, tipo: 'B', color: '#7C6FF7', empresa: DEFAULT_COMPANY, cargo: '' }

export default function CreateUserModal({ onClose }: { onClose: () => void }) {
  const { setAdminUsuarios, border, t2, t3, accent, inputStyle, roles } = useApp()
  const { t } = useT()
  const [nuevoUsr, setNuevoUsr] = useState(DEFAULT_NEW)
  const [showCreatePwd, setShowCreatePwd] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<{ pwd: string; nombre: string; email: string; cargo: string; emailWarning: string | null } | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function crearUsuario() {
    setCreateError(null)
    if (!nuevoUsr.nombre || !nuevoUsr.apellido || !nuevoUsr.email || !nuevoUsr.password) {
      setCreateError(t('admin.create.fillRequired')); return
    }
    if (nuevoUsr.password.length < 8) { setCreateError(t('admin.create.pwdMin')); return }
    setGuardando(true)
    try {
      const cargo = nuevoUsr.cargo || CARGOS_DIR[nuevoUsr.email.toLowerCase()] || ''
      const { res, result } = await apiPost('/api/admin/create-user', {
        email: nuevoUsr.email, password: nuevoUsr.password, nombre: nuevoUsr.nombre, apellido: nuevoUsr.apellido,
        rol: nuevoUsr.rol, tipo: nuevoUsr.tipo, color: nuevoUsr.color, empresa: nuevoUsr.empresa,
        ubicacion: 'Guayaquil, Ecuador', cargo,
      })
      if (!res.ok) { setCreateError(result.error || t('admin.create.failed')); setGuardando(false); return }
      setCreateSuccess({ pwd: nuevoUsr.password, nombre: `${nuevoUsr.nombre} ${nuevoUsr.apellido}`, email: nuevoUsr.email, cargo, emailWarning: result.emailWarning || null })
      const { data } = await usuariosRepo.listAll()
      setAdminUsuarios((data || []).map(u => ({ ...u, cargo: u.cargo || CARGOS_DIR[u.email?.toLowerCase()] || '' })))
    } catch (err: any) {
      setCreateError(err.message || t('admin.create.netErr'))
    }
    setGuardando(false)
  }

  return (
    <Modal title={createSuccess ? t('admin.create.successTitle') : t('admin.create.title')} width={520} onClose={onClose}>
        {createSuccess ? (
          <CredentialsPanel label={t('admin.create.createdOk', { name: createSuccess.nombre })} name={createSuccess.nombre} email={createSuccess.email} pwd={createSuccess.pwd} onClose={onClose} extra={{ cargo: createSuccess.cargo, emailWarning: createSuccess.emailWarning }} />
        ) : (
          <>
            <ErrorBlock msg={createError} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('common.firstName')} *</label><input type="text" value={nuevoUsr.nombre} onChange={e => setNuevoUsr(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} /></div>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('common.lastName')} *</label><input type="text" value={nuevoUsr.apellido} onChange={e => setNuevoUsr(p => ({ ...p, apellido: e.target.value }))} style={inputStyle} /></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('common.email')} *</label><input type="email" value={nuevoUsr.email} onChange={e => setNuevoUsr(p => ({ ...p, email: e.target.value }))} placeholder={t('admin.userEmailPlaceholder')} style={inputStyle} /></div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ fontSize: 11, color: t3 }}>{t('admin.tempPassword')} *</label>
                <button type="button" onClick={() => { setNuevoUsr(p => ({ ...p, password: generateTempPassword() })); setShowCreatePwd(true) }} style={{ padding: '3px 10px', fontSize: 10, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: accent, cursor: 'pointer' }}>{t('admin.generatePassword')}</button>
              </div>
              <PasswordInput value={nuevoUsr.password} onChange={v => setNuevoUsr(p => ({ ...p, password: v }))} show={showCreatePwd} setShow={setShowCreatePwd} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('common.role')}</label><select value={nuevoUsr.rol} onChange={e => setNuevoUsr(p => ({ ...p, rol: e.target.value }))} style={inputStyle}>{roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}</select></div>
              <div><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('common.type')}</label><select value={nuevoUsr.tipo} onChange={e => setNuevoUsr(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}><option value="A">{t('admin.typeA')}</option><option value="B">{t('admin.typeB')}</option></select></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('admin.cargoTitle')}</label><input type="text" value={nuevoUsr.cargo} onChange={e => setNuevoUsr(p => ({ ...p, cargo: e.target.value }))} placeholder={CARGOS_DIR[nuevoUsr.email.toLowerCase()] || t('admin.cargoPlaceholder')} style={inputStyle} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('common.company')}</label><select value={nuevoUsr.empresa} onChange={e => setNuevoUsr(p => ({ ...p, empresa: e.target.value }))} style={inputStyle}>{companyOptions(nuevoUsr.empresa).map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div style={{ marginBottom: 20 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>{t('common.avatarColor')}</label><div style={{ display: 'flex', gap: 8 }}>{COLORES_AVATAR.map(c => <div key={c} onClick={() => setNuevoUsr(p => ({ ...p, color: c }))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: nuevoUsr.color === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />)}</div></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>{t('common.cancel')}</button>
              <button onClick={crearUsuario} disabled={guardando} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#F87171', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardando ? t('admin.create.creating') : t('admin.createUser')}</button>
            </div>
          </>
        )}
    </Modal>
  )
}
