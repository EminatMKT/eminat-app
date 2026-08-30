'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { type RoleRow } from '@/shared/auth/permissions'
import { apiSend } from '@/shared/utils/api'
import Button from '@/shared/components/ui/Button'
import ListToolbar from '@/shared/components/ui/ListToolbar'
import RoleModal from './RoleModal'
import RoleCard from './RoleCard'

export default function RolesManager() {
  const { roles, reloadRoles, mostrarMensaje } = useApp()
  const { t } = useT()
  const [busqueda, setBusqueda] = useState('')
  const [modalRole, setModalRole] = useState<RoleRow | null>(null)
  const [modalNew, setModalNew] = useState(false)
  const [borrando, setBorrando] = useState<string | null>(null)

  const q = busqueda.trim().toLowerCase()
  const filtrados = q ? roles.filter(r => r.label.toLowerCase().includes(q) || r.key.includes(q)) : roles

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
      {/* Mismo encabezado que Usuarios y los catálogos: buscador + alta. El título
          lo da la sub-pestaña, así que repetirlo acá era ruido. */}
      <ListToolbar busqueda={busqueda} setBusqueda={setBusqueda}
        action={<Button kind="new" label={t('admin.newRole')} onClick={() => setModalNew(true)} />} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtrados.map(r => (
          <RoleCard key={r.key} role={r} onEdit={setModalRole} onDelete={borrar} deleting={borrando === r.key} />
        ))}
      </div>
      {modalRole && <RoleModal role={modalRole} onClose={() => setModalRole(null)} />}
      {modalNew && <RoleModal onClose={() => setModalNew(false)} />}
    </div>
  )
}
