'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { DEFAULT_ROLE } from '@/shared/auth/permissions'
import AppShell from '@/shared/components/AppShell'
import AccessDenied from '@/shared/components/AccessDenied'
import TabButton from '@/shared/components/ui/TabButton'
import { PageTransition } from '@/shared/motion'
import StatsBar from './StatsBar'
import RoleFilterBar from './RoleFilterBar'
import UserTable from './UserTable'
import RolesManager from './RolesManager'
import OrgManager from './OrgManager'
import CreateUserModal from './CreateUserModal'
import EditUserModal, { type EditUserDraft } from './EditUserModal'
import ResetPasswordModal from './ResetPasswordModal'
import DeleteUserModal from './DeleteUserModal'
import { cargoIdsOf, isOrgCat, type OrgCat } from '../org-catalogs'
import type { AdminUser, ResetTarget } from '../types'

// Convención de navegación del shell (ver appShellConfig): el sidebar lista las
// SECCIONES (Usuarios · Organización) y la barra horizontal solo las sub-vistas
// de la sección activa — nada se duplica entre ejes. Por eso `vista` es plana:
// cada sub-vista es un valor de primer nivel, igual que en Stratix.
type Vista = 'usuarios' | 'roles' | OrgCat

export default function AdminModule() {
  const { esAdmin, adminUsuarios, border } = useApp()
  const { t } = useT()
  const [vista, setVista] = useState<Vista>('usuarios')
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
    empresa_id: u.empresa_id ?? null, cargoIds: cargoIdsOf(u),
  })

  const crearBtn = <button onClick={() => setModalCrear(true)} style={{ padding: '7px 16px', borderRadius: 10, background: '#F87171', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>{t('admin.newUser')}</button>

  return (
    <AppShell actions={vista === 'usuarios' ? crearBtn : undefined} activeTab={vista} onTabChange={v => setVista(v as Vista)}>
      <PageTransition>
        {/* Barra de la sección Usuarios — mismo formato que StratixTabNav. */}
        {!isOrgCat(vista) && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
            <TabButton label={t('admin.tabUsers')} active={vista === 'usuarios'} onClick={() => setVista('usuarios')} />
            <TabButton label={t('admin.tabRoles')} active={vista === 'roles'} onClick={() => setVista('roles')} />
          </div>
        )}
        {vista === 'usuarios' && (
          <>
            <StatsBar />
            <RoleFilterBar busqueda={busqueda} setBusqueda={setBusqueda} filtroRol={filtroRol} setFiltroRol={setFiltroRol} />
            <UserTable users={adminFiltrado} onEdit={openEdit} onReset={setModalReset} onDelete={setModalEliminar} />
          </>
        )}
        {vista === 'roles' && <RolesManager />}
        {isOrgCat(vista) && <OrgManager cat={vista} onCatChange={setVista} />}

        {modalCrear && <CreateUserModal onClose={() => setModalCrear(false)} />}
        {modalEditar && <EditUserModal user={modalEditar} onClose={() => setModalEditar(null)} />}
        {modalReset && <ResetPasswordModal target={modalReset} onClose={() => setModalReset(null)} />}
        {modalEliminar && <DeleteUserModal userId={modalEliminar} onClose={() => setModalEliminar(null)} />}
      </PageTransition>
    </AppShell>
  )
}
