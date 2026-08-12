'use client'
import { useState } from 'react'
import { useApp, COLORES_AVATAR } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { DEFAULT_ROLE } from '@/shared/auth/permissions'
import { usuariosRepo } from '@/shared/data'
import { apiPost } from '@/shared/api'
import Modal from '@/shared/components/Modal'
import { generateTempPassword } from '../password'
import PasswordInput from './PasswordInput'
import CargosPicker from './CargosPicker'
import CatalogSelect from './CatalogSelect'
import CredentialsPanel from './CredentialsPanel'
import ErrorBlock from './ErrorBlock'

const DEFAULT_NEW = {
  nombre: '', apellido: '', email: '', password: '', rol: DEFAULT_ROLE, color: '#7C6FF7',
  empresa_id: null as string | null, jornada_id: null as string | null,
  vinculacion_id: null as string | null, equipo_id: null as string | null,
  cargoIds: [] as string[],
}

export default function CreateUserModal({ onClose }: { onClose: () => void }) {
  const { setAdminUsuarios, border, t2, t3, accent, inputStyle, roles, cargos, empresas, jornadas, vinculaciones, equipos } = useApp()
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
      const cargo = cargos.filter(c => nuevoUsr.cargoIds.includes(c.id)).map(c => c.nombre).join(', ')
      const { res, result } = await apiPost<{ error?: string; emailWarning?: string | null }>('/api/admin/create-user', {
        email: nuevoUsr.email, password: nuevoUsr.password, nombre: nuevoUsr.nombre, apellido: nuevoUsr.apellido,
        rol: nuevoUsr.rol, color: nuevoUsr.color, empresa_id: nuevoUsr.empresa_id,
        jornada_id: nuevoUsr.jornada_id, vinculacion_id: nuevoUsr.vinculacion_id,
        equipo_id: nuevoUsr.equipo_id,
        ubicacion: 'Guayaquil, Ecuador', cargoIds: nuevoUsr.cargoIds,
      })
      if (!res.ok) { setCreateError(result.error || t('admin.create.failed')); setGuardando(false); return }
      setCreateSuccess({ pwd: nuevoUsr.password, nombre: `${nuevoUsr.nombre} ${nuevoUsr.apellido}`, email: nuevoUsr.email, cargo, emailWarning: result.emailWarning || null })
      const { data } = await usuariosRepo.listAll()
      setAdminUsuarios(data || [])
    } catch (err: unknown) {
      setCreateError((err instanceof Error ? err.message : '') || t('admin.create.netErr'))
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
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('common.email')} *</label><input type="email" value={nuevoUsr.email} onChange={e => setNuevoUsr(p => ({ ...p, email: e.target.value }))} autoComplete="off" placeholder={t('admin.userEmailPlaceholder')} style={inputStyle} /></div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ fontSize: 11, color: t3 }}>{t('admin.tempPassword')} *</label>
                <button type="button" onClick={() => { setNuevoUsr(p => ({ ...p, password: generateTempPassword() })); setShowCreatePwd(true) }} style={{ padding: '3px 10px', fontSize: 10, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: accent, cursor: 'pointer' }}>{t('admin.generatePassword')}</button>
              </div>
              <PasswordInput value={nuevoUsr.password} onChange={v => setNuevoUsr(p => ({ ...p, password: v }))} show={showCreatePwd} setShow={setShowCreatePwd} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('common.role')}</label>
              <select value={nuevoUsr.rol} onChange={e => setNuevoUsr(p => ({ ...p, rol: e.target.value }))} style={inputStyle}>{roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}</select>
            </div>
            <CargosPicker value={nuevoUsr.cargoIds} onChange={ids => setNuevoUsr(p => ({ ...p, cargoIds: ids }))} />
            <CatalogSelect labelKey="common.company" value={nuevoUsr.empresa_id} rows={empresas} onChange={id => setNuevoUsr(p => ({ ...p, empresa_id: id }))} />
            <CatalogSelect labelKey="common.jornada" value={nuevoUsr.jornada_id} rows={jornadas} onChange={id => setNuevoUsr(p => ({ ...p, jornada_id: id }))} />
            <CatalogSelect labelKey="common.vinculacion" value={nuevoUsr.vinculacion_id} rows={vinculaciones} onChange={id => setNuevoUsr(p => ({ ...p, vinculacion_id: id }))} />
            {/* Sin equipo la persona no entra en las derivaciones de Stratix y
                nunca aparece como asignable. Antes no había dónde setearlo. */}
            <CatalogSelect labelKey="common.equipo" value={nuevoUsr.equipo_id} rows={equipos} onChange={id => setNuevoUsr(p => ({ ...p, equipo_id: id }))} />
            <div style={{ marginBottom: 20 }}><label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 8 }}>{t('common.avatarColor')}</label><div style={{ display: 'flex', gap: 8 }}>{COLORES_AVATAR.map(c => <div key={c} onClick={() => setNuevoUsr(p => ({ ...p, color: c }))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: nuevoUsr.color === c ? '3px solid white' : '2px solid transparent', boxSizing: 'border-box' }} />)}</div></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>{t('common.cancel')}</button>
              <button onClick={crearUsuario} disabled={guardando} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardando ? t('admin.create.creating') : t('admin.createUser')}</button>
            </div>
          </>
        )}
    </Modal>
  )
}
