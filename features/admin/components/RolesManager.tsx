'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { ALL_MODULES, ADMIN_ROLE, MODULE_META, type RoleRow } from '@/shared/auth/permissions'
import { apiSend } from '@/shared/api'
import RoleModal from './RoleModal'

export default function RolesManager() {
  const { roles, roleModuleMap, adminUsuarios, reloadRoles, s1, s2, border, t1, t2, t3, accent, mostrarMensaje } = useApp()
  const [modalRole, setModalRole] = useState<RoleRow | null>(null)
  const [modalNew, setModalNew] = useState(false)
  const [borrando, setBorrando] = useState<string | null>(null)

  async function borrar(r: RoleRow) {
    setBorrando(r.key)
    try {
      const { res, result } = await apiSend('DELETE', `/api/admin/roles/${r.key}`)
      if (!res.ok) { mostrarMensaje('error', result.error || 'No se pudo borrar el rol.'); setBorrando(null); return }
      await reloadRoles()
      mostrarMensaje('ok', 'Rol borrado')
    } catch (err: any) {
      mostrarMensaje('error', err?.message || 'Error de red al borrar el rol.')
    }
    setBorrando(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, color: t1 }}>Roles del sistema</div>
        <button onClick={() => setModalNew(true)} style={{ padding: '7px 16px', borderRadius: 10, background: accent, color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>+ Nuevo rol</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {roles.map(r => {
          const isAdmin = r.key === ADMIN_ROLE
          const mods = isAdmin ? ALL_MODULES : (roleModuleMap[r.key] || [])
          const userCount = adminUsuarios.filter(u => u.rol === r.key).length
          const canDelete = !isAdmin && !r.is_system && userCount === 0
          return (
            <div key={r.key} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, color: t1 }}>{r.label}</span>
                    <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: t3 }}>{r.key}</span>
                    {r.is_system && <span style={{ fontSize: 9, fontFamily: 'DM Mono', textTransform: 'uppercase', color: t3, border: `1px solid ${border}`, borderRadius: 6, padding: '1px 6px' }}>sistema</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {mods.length === 0
                      ? <span style={{ fontSize: 11, color: t3 }}>Sin módulos</span>
                      : mods.map(m => (
                        <span key={m} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, background: s2, border: `1px solid ${border}`, color: t2 }}>{MODULE_META[m].name}</span>
                      ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: t3, whiteSpace: 'nowrap' }}>{userCount} {userCount === 1 ? 'usuario' : 'usuarios'}</span>
                  {!isAdmin && (
                    <>
                      <button onClick={() => setModalRole(r)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, border: `1px solid ${border}`, background: 'transparent', color: t2, cursor: 'pointer' }}>Editar</button>
                      <button onClick={() => borrar(r)} disabled={!canDelete || borrando === r.key} title={!canDelete ? (r.is_system ? 'Rol del sistema' : 'Tiene usuarios asignados') : undefined} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, border: '1px solid rgba(248,113,113,.30)', background: canDelete ? 'rgba(248,113,113,.10)' : 'transparent', color: canDelete ? '#F87171' : t3, cursor: canDelete ? 'pointer' : 'not-allowed', opacity: canDelete ? 1 : 0.5 }}>{borrando === r.key ? '...' : 'Borrar'}</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {modalRole && <RoleModal role={modalRole} onClose={() => setModalRole(null)} />}
      {modalNew && <RoleModal onClose={() => setModalNew(false)} />}
    </div>
  )
}
