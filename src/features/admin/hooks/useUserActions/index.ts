import { useApp } from '@/shared/context/AppContext'
import { usuariosRepo } from '@/shared/data'
import { apiPost } from '@/shared/utils/api'
import { useT } from '@/shared/i18n'
import ADMIN_API from '@/shared/constants/admin-api'

const UPDATE_USER_URL = ADMIN_API.updateUser
const ERROR = 'error'
const OK = 'ok'

export default function useUserActions() {
  const { setAdminUsuarios, mostrarMensaje } = useApp()
  const { t } = useT()
  const patchUser = (id: string, patch: object) => {
    setAdminUsuarios(prev => prev.map(u => (u.id === id ? { ...u, ...patch } : u)))
  }

  async function changeRole(id: string, rol: string) {
    const change = { id, rol }
    const { res, result } = await apiPost<{ error?: string }>(UPDATE_USER_URL, change)
    if (!res.ok) { mostrarMensaje(ERROR, result.error || t('admin.user.roleFailed')); return }
    patchUser(id, change)
    mostrarMensaje(OK, t('admin.user.roleUpdated'))
  }

  async function toggleActive(id: string, activo: boolean) {
    const change = { id, activo: !activo }
    try {
      const { res, result } = await apiPost<{ error?: string }>(UPDATE_USER_URL, change)
      if (!res.ok) { mostrarMensaje(ERROR, result.error || t('admin.user.statusFailed')); return }
      patchUser(id, change)
      mostrarMensaje(OK, t(activo ? 'admin.user.deactivated' : 'admin.user.activated'))
    } catch (err: unknown) {
      mostrarMensaje(ERROR, (err instanceof Error && err.message) || t('admin.user.statusNetErr'))
    }
  }

  async function validateUser(id: string) {
    const validated = { validado: true, activo: true }
    await usuariosRepo.validar(id)
    patchUser(id, validated)
    mostrarMensaje(OK, t('admin.user.validated'))
  }

  return { changeRole, toggleActive, validateUser }
}

// Per-row actions on the admin user list (role, activation, validation). Each one goes through
// the server and, on success, patches `adminUsuarios` in place instead of reloading the list.
// Activation goes through the admin endpoint (service_role) rather than straight to the table, so
// it never depends on what RLS lets the client do, and the admin sees the real error.
