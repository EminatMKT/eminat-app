'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { normalizeRole, ADMIN_ROLE, DEFAULT_ROLE } from '@/shared/auth/permissions'
import { COMPANY_COLORS, companyShort } from '@/shared/constants/companies'
import { useUserActions } from '../hooks/useUserActions'
import ConfirmModal from '@/shared/components/ConfirmModal'
import type { AdminUser, ResetTarget } from '../types'

type Props = {
  user: AdminUser
  onEdit: (u: AdminUser) => void
  onReset: (t: ResetTarget) => void
  onDelete: (id: string) => void
}

export default function UserRow({ user: u, onEdit, onReset, onDelete }: Props) {
  const { s2, border, t1, t2, t3, accent, roles } = useApp()
  const { t } = useT()
  const { cambiarRol, toggleActivo, validarUsuario } = useUserActions()
  const isProtected = normalizeRole(u.rol) === ADMIN_ROLE
  const roleLabel = roles.find(r => r.key === u.rol)?.label || u.rol
  const nombre = `${u.nombre || ''} ${u.apellido || ''}`.trim()
  // Confirmación previa para acciones que hoy aplican al instante (sin deshacer fácil).
  const [confirm, setConfirm] = useState<{ kind: 'toggle' } | { kind: 'assign'; value: string } | null>(null)
  return (
    <tr style={{ borderBottom: `1px solid ${border}` }}>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>{u.nombre?.[0]}{u.apellido?.[0]}</div>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: t1 }}>{u.nombre} {u.apellido}</div><div style={{ fontSize: 9, color: t3 }}>Tipo {u.tipo || 'B'} · {u.ubicacion || 'Ecuador'}</div></div>
        </div>
      </td>
      <td style={{ padding: '10px 14px', fontSize: 10, color: t3, fontFamily: 'DM Mono' }}>{u.email}</td>
      <td style={{ padding: '10px 14px', fontSize: 11, color: t2 }}>{u.cargo || '—'}</td>
      <td style={{ padding: '10px 14px' }}>{u.empresa ? <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: `${COMPANY_COLORS[u.empresa] || accent}20`, color: COMPANY_COLORS[u.empresa] || accent }}>{companyShort(u.empresa)}</span> : <span style={{ fontSize: 10, color: t3 }}>—</span>}</td>
      {/* Solo sin_asignar usa el select inline (asignación rápida). El resto muestra el rol
          como badge: el cambio se hace desde el modal de editar. Admin en rojo, otros en acento. */}
      <td style={{ padding: '10px 14px' }}>{normalizeRole(u.rol) === DEFAULT_ROLE ? <select value={u.rol} onChange={e => { if (e.target.value !== u.rol) setConfirm({ kind: 'assign', value: e.target.value }) }} style={{ padding: '3px 8px', borderRadius: 8, border: `1px solid ${border}`, background: s2, color: t2, fontSize: 11, cursor: 'pointer', outline: 'none' }}>{roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}</select> : <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: isProtected ? 'rgba(248,113,113,.12)' : `${accent}1a`, color: isProtected ? '#F87171' : accent }}>{roleLabel}</span>}</td>
      <td style={{ padding: '10px 14px' }}>{u.validado && u.activo ? <span style={{ fontSize: 11, color: '#34D399' }}>{t('admin.statusActive')}</span> : !u.validado ? <span style={{ fontSize: 11, color: '#FBB040' }}>{t('admin.statusPending')}</span> : <span style={{ fontSize: 11, color: '#F87171' }}>{t('admin.statusInactive')}</span>}</td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => onEdit(u)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: 'none', background: '#7C6FF7', color: 'white', cursor: 'pointer' }}>{t('common.edit')}</button>
          <button onClick={() => onReset({ id: u.id, nombre: u.nombre || '', email: u.email || '' })} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: 'none', background: '#60A5FA', color: 'white', cursor: 'pointer' }}>{t('admin.resetPwd')}</button>
          {!u.validado && <button onClick={() => validarUsuario(u.id)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: 'none', background: '#34D399', color: 'white', cursor: 'pointer' }}>{t('admin.validate')}</button>}
          {!isProtected && <button onClick={() => setConfirm({ kind: 'toggle' })} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: 'none', background: '#FBB040', color: 'white', cursor: 'pointer' }}>{u.activo ? t('admin.deactivate') : t('admin.activate')}</button>}
          {!isProtected && <button onClick={() => onDelete(u.id)} style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, border: 'none', background: '#F87171', color: 'white', cursor: 'pointer' }}>{t('common.delete')}</button>}
        </div>
        {confirm?.kind === 'assign' && (
          <ConfirmModal
            title={t('admin.confirm.assignTitle')}
            message={t('admin.confirm.assignMsg', { role: roles.find(r => r.key === confirm.value)?.label || confirm.value, name: nombre })}
            confirmLabel={t('admin.confirm.assignBtn')}
            onConfirm={async () => { await cambiarRol(u.id, confirm.value); setConfirm(null) }}
            onClose={() => setConfirm(null)}
          />
        )}
        {confirm?.kind === 'toggle' && (
          <ConfirmModal
            title={u.activo ? t('admin.confirm.deactivateTitle') : t('admin.confirm.activateTitle')}
            message={t(u.activo ? 'admin.confirm.deactivateMsg' : 'admin.confirm.activateMsg', { name: nombre })}
            confirmLabel={u.activo ? t('admin.deactivate') : t('admin.activate')}
            destructive={!!u.activo}
            onConfirm={async () => { await toggleActivo(u.id, !!u.activo); setConfirm(null) }}
            onClose={() => setConfirm(null)}
          />
        )}
      </td>
    </tr>
  )
}
