'use client'
import { useState } from 'react'
import { ConfirmModal } from '@/shared/components/ui'
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
  // Borrar un rol se lleva sus módulos asignados y no tiene vuelta: hasta hoy ocurría al primer
  // clic, sin preguntar (rules/ui.md · "todo proceso destructivo lleva confirmación").
  const [porBorrar, setPorBorrar] = useState<RoleRow | null>(null)

  const q = busqueda.trim().toLowerCase()
  const filtrados = q ? roles.filter(r => r.label.toLowerCase().includes(q) || r.key.includes(q)) : roles

  async function borrar(r: RoleRow) {
    setBorrando(r.key)
    try {
      const { res, result } = await apiSend<{ error?: string }>('DELETE', `/api/admin/roles/${r.key}`)
      if (!res.ok) { mostrarMensaje('error', result.error || t('admin.roleDeleteFailed')); setBorrando(null); return }
      await reloadRoles()
      mostrarMensaje('ok', t('admin.roleDeleted'))
    } catch (err: unknown) {
      mostrarMensaje('error', (err instanceof Error ? err.message : '') || t('admin.roleDeleteNetErr'))
    }
    setBorrando(null)
  }

  async function confirmarBorrado() {
    const rol = porBorrar
    setPorBorrar(null)
    if (rol) await borrar(rol)
  }

  return (
    <div>
      {/* Mismo encabezado que Usuarios y los catálogos: buscador + alta. El título
          lo da la sub-pestaña, así que repetirlo acá era ruido. */}
      <ListToolbar busqueda={busqueda} setBusqueda={setBusqueda}
        action={<Button kind="new" label={t('admin.newRole')} onClick={() => setModalNew(true)} />} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtrados.map(r => (
          <RoleCard key={r.key} role={r} onEdit={setModalRole} onDelete={setPorBorrar} deleting={borrando === r.key} />
        ))}
      </div>
      {modalRole && <RoleModal role={modalRole} onClose={() => setModalRole(null)} />}
      {modalNew && <RoleModal onClose={() => setModalNew(false)} />}
      {porBorrar && (
        <ConfirmModal
          destructive
          title={t('admin.roleDeleteConfirmTitle', { nombre: porBorrar.label })}
          message={t('admin.roleDeleteConfirmMsg')}
          confirmLabel={t('common.delete')}
          onClose={() => setPorBorrar(null)}
          onConfirm={confirmarBorrado}
        />
      )}
    </div>
  )
}
