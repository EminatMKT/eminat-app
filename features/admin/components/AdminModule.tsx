'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { DEFAULT_COMPANY } from '@/shared/constants/companies'
import AppShell from '@/shared/components/AppShell'
import { PageTransition } from '@/shared/motion'
import StatsBar from './StatsBar'
import RoleFilterBar from './RoleFilterBar'
import UserTable from './UserTable'
import CreateUserModal from './CreateUserModal'
import EditUserModal, { type EditUserDraft } from './EditUserModal'
import ResetPasswordModal from './ResetPasswordModal'
import DeleteUserModal from './DeleteUserModal'
import type { AdminUser, ResetTarget } from '../types'

export default function AdminModule() {
  const { esSuperAdmin, adminUsuarios, t1 } = useApp()
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEditar, setModalEditar] = useState<EditUserDraft | null>(null)
  const [modalReset, setModalReset] = useState<ResetTarget | null>(null)
  const [modalEliminar, setModalEliminar] = useState<string | null>(null)

  if (!esSuperAdmin) {
    return <AppShell><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}><div style={{ fontSize: 48 }}>🔒</div><div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Access denied</div></div></AppShell>
  }

  const adminFiltrado = adminUsuarios.filter(u => {
    if (filtroRol !== 'todos' && u.rol !== filtroRol) return false
    if (busqueda) { const q = busqueda.toLowerCase(); return (u.nombre || '').toLowerCase().includes(q) || (u.apellido || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) }
    return true
  })

  const openEdit = (u: AdminUser) => setModalEditar({
    id: u.id, nombre: u.nombre || '', apellido: u.apellido || '', email: u.email || '', currentEmail: u.email || '',
    rol: u.rol || 'stratix360', tipo: u.tipo || 'B', color: u.color || '#7C6FF7', ubicacion: u.ubicacion || 'Guayaquil, Ecuador',
    empresa: u.empresa || DEFAULT_COMPANY, cargo: u.cargo || '',
  })

  const crearBtn = <button onClick={() => setModalCrear(true)} style={{ padding: '7px 16px', borderRadius: 10, background: '#F87171', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>+ New user</button>

  return (
    <AppShell actions={crearBtn}>
      <PageTransition>
        <StatsBar />
        <RoleFilterBar busqueda={busqueda} setBusqueda={setBusqueda} filtroRol={filtroRol} setFiltroRol={setFiltroRol} />
        <UserTable users={adminFiltrado} onEdit={openEdit} onReset={setModalReset} onDelete={setModalEliminar} />

        {modalCrear && <CreateUserModal onClose={() => setModalCrear(false)} />}
        {modalEditar && <EditUserModal user={modalEditar} onClose={() => setModalEditar(null)} />}
        {modalReset && <ResetPasswordModal target={modalReset} onClose={() => setModalReset(null)} />}
        {modalEliminar && <DeleteUserModal userId={modalEliminar} onClose={() => setModalEliminar(null)} />}
      </PageTransition>
    </AppShell>
  )
}
