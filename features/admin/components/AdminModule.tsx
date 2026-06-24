'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { DEFAULT_ROLE } from '@/shared/auth/permissions'
import { DEFAULT_COMPANY } from '@/shared/constants/companies'
import AppShell from '@/shared/components/AppShell'
import AccessDenied from '@/shared/components/AccessDenied'
import TabButton from '@/shared/components/ui/TabButton'
import { PageTransition } from '@/shared/motion'
import StatsBar from './StatsBar'
import RoleFilterBar from './RoleFilterBar'
import UserTable from './UserTable'
import RolesManager from './RolesManager'
import CreateUserModal from './CreateUserModal'
import EditUserModal, { type EditUserDraft } from './EditUserModal'
import ResetPasswordModal from './ResetPasswordModal'
import DeleteUserModal from './DeleteUserModal'
import type { AdminUser, ResetTarget } from '../types'

export default function AdminModule() {
  const { esAdmin, adminUsuarios, border } = useApp()
  const [vista, setVista] = useState<'usuarios' | 'roles'>('usuarios')
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEditar, setModalEditar] = useState<EditUserDraft | null>(null)
  const [modalReset, setModalReset] = useState<ResetTarget | null>(null)
  const [modalEliminar, setModalEliminar] = useState<string | null>(null)

  if (!esAdmin) return <AccessDenied />

  const adminFiltrado = adminUsuarios.filter(u => {
    if (filtroRol !== 'todos' && u.rol !== filtroRol) return false
    if (busqueda) { const q = busqueda.toLowerCase(); return (u.nombre || '').toLowerCase().includes(q) || (u.apellido || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) }
    return true
  })

  const openEdit = (u: AdminUser) => setModalEditar({
    id: u.id, nombre: u.nombre || '', apellido: u.apellido || '', email: u.email || '', currentEmail: u.email || '',
    rol: u.rol || DEFAULT_ROLE, tipo: u.tipo || 'B', color: u.color || '#7C6FF7', ubicacion: u.ubicacion || 'Guayaquil, Ecuador',
    empresa: u.empresa || DEFAULT_COMPANY, cargo: u.cargo || '',
  })

  const crearBtn = <button onClick={() => setModalCrear(true)} style={{ padding: '7px 16px', borderRadius: 10, background: '#F87171', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>+ New user</button>

  return (
    <AppShell actions={vista === 'usuarios' ? crearBtn : undefined}>
      <PageTransition>
        <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
          <TabButton label="Usuarios" active={vista === 'usuarios'} onClick={() => setVista('usuarios')} />
          <TabButton label="Roles" active={vista === 'roles'} onClick={() => setVista('roles')} />
        </div>
        {vista === 'usuarios' ? (
          <>
            <StatsBar />
            <RoleFilterBar busqueda={busqueda} setBusqueda={setBusqueda} filtroRol={filtroRol} setFiltroRol={setFiltroRol} />
            <UserTable users={adminFiltrado} onEdit={openEdit} onReset={setModalReset} onDelete={setModalEliminar} />
          </>
        ) : (
          <RolesManager />
        )}

        {modalCrear && <CreateUserModal onClose={() => setModalCrear(false)} />}
        {modalEditar && <EditUserModal user={modalEditar} onClose={() => setModalEditar(null)} />}
        {modalReset && <ResetPasswordModal target={modalReset} onClose={() => setModalReset(null)} />}
        {modalEliminar && <DeleteUserModal userId={modalEliminar} onClose={() => setModalEliminar(null)} />}
      </PageTransition>
    </AppShell>
  )
}
