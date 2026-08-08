'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { type RoleRow } from '@/shared/auth/permissions'
import { apiSend } from '@/shared/api'
import NewButton from '@/shared/components/ui/NewButton'
import RoleModal from './RoleModal'
import RoleCard from './RoleCard'

export default function RolesManager() {
  const { roles, reloadRoles, t1, mostrarMensaje } = useApp()
  const { t } = useT()
  const [modalRole, setModalRole] = useState<RoleRow | null>(null)
  const [modalNew, setModalNew] = useState(false)
  const [borrando, setBorrando] = useState<string | null>(null)

  async function borrar(r: RoleRow) {
    setBorrando(r.key)
    try {
      const { res, result } = await apiSend<{ error?: string }>('DELETE', `/api/admin/roles/${r.key}`)
      if (!res.ok) { mostrarMensaje('error', result.error || 'No se pudo borrar el rol.'); setBorrando(null); return }
      await reloadRoles()
      mostrarMensaje('ok', 'Rol borrado')
    } catch (err: unknown) {
      mostrarMensaje('error', (err instanceof Error ? err.message : '') || 'Error de red al borrar el rol.')
    }
    setBorrando(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, color: t1 }}>{t('admin.systemRoles')}</div>
        <NewButton label={t('admin.newRole')} onClick={() => setModalNew(true)} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {roles.map(r => (
          <RoleCard key={r.key} role={r} onEdit={setModalRole} onDelete={borrar} deleting={borrando === r.key} />
        ))}
      </div>
      {modalRole && <RoleModal role={modalRole} onClose={() => setModalRole(null)} />}
      {modalNew && <RoleModal onClose={() => setModalNew(false)} />}
    </div>
  )
}
