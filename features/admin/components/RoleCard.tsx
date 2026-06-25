'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { ALL_MODULES, ADMIN_ROLE, MODULE_META, type RoleRow } from '@/shared/auth/permissions'

// Tarjeta de un rol en el panel admin. Deriva sus flags (admin/módulos/usuarios/borrable)
// del contexto; RolesManager solo le pasa el rol y los callbacks.
export default function RoleCard({ role: r, onEdit, onDelete, deleting }: {
  role: RoleRow
  onEdit: (r: RoleRow) => void
  onDelete: (r: RoleRow) => void
  deleting: boolean
}) {
  const { s1, s2, border, t1, t2, t3, roleModuleMap, adminUsuarios } = useApp()
  const { t } = useT()
  const isAdmin = r.key === ADMIN_ROLE
  const mods = isAdmin ? ALL_MODULES : (roleModuleMap[r.key] || [])
  const userCount = adminUsuarios.filter(u => u.rol === r.key).length
  const canDelete = !isAdmin && !r.is_system && userCount === 0

  return (
    <div data-testid={`role-${r.key}`} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, color: t1 }}>{r.label}</span>
            <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: t3 }}>{r.key}</span>
            {r.is_system && <span style={{ fontSize: 9, fontFamily: 'DM Mono', textTransform: 'uppercase', color: t3, border: `1px solid ${border}`, borderRadius: 6, padding: '1px 6px' }}>{t('admin.systemBadge')}</span>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {mods.length === 0
              ? <span style={{ fontSize: 11, color: t3 }}>{t('admin.noModules')}</span>
              : mods.map(m => (
                <span key={m} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, background: s2, border: `1px solid ${border}`, color: t2 }}>{MODULE_META[m].name}</span>
              ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: t3, whiteSpace: 'nowrap' }}>{userCount} {userCount === 1 ? 'usuario' : 'usuarios'}</span>
          {!isAdmin && (
            <>
              <button onClick={() => onEdit(r)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, border: `1px solid ${border}`, background: 'transparent', color: t2, cursor: 'pointer' }}>{t('common.edit')}</button>
              <button onClick={() => onDelete(r)} data-testid={`del-${r.key}`} disabled={!canDelete || deleting} title={!canDelete ? (r.is_system ? t('admin.roleSystemTip') : t('admin.roleHasUsersTip')) : undefined} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, border: '1px solid rgba(248,113,113,.30)', background: canDelete ? 'rgba(248,113,113,.10)' : 'transparent', color: canDelete ? '#F87171' : t3, cursor: canDelete ? 'pointer' : 'not-allowed', opacity: canDelete ? 1 : 0.5 }}>{deleting ? '...' : t('common.delete')}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
