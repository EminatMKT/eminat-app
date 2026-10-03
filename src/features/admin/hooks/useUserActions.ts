import { useApp } from '@/shared/context/AppContext'
import { usuariosRepo } from '@/shared/data'
import { apiPost } from '@/shared/utils/api'
import { useT } from '@/shared/i18n'

const UPDATE_USER_URL = '/api/admin/update-user'
const ERROR = 'error'
const OK = 'ok'

// Acciones por fila que mutan adminUsuarios in-place (rol, activación, validación).
export function useUserActions() {
  const { setAdminUsuarios, mostrarMensaje } = useApp()
  const { t } = useT()

  async function cambiarRol(id: string, rol: string) {
    const { res, result } = await apiPost<{ error?: string }>(UPDATE_USER_URL, { id, rol })
    if (!res.ok) { mostrarMensaje(ERROR, result.error || t('admin.user.roleFailed')); return }
    setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, rol } : u))
    mostrarMensaje(OK, t('admin.user.roleUpdated'))
  }

  async function toggleActivo(id: string, activo: boolean) {
    // Ruteado por el endpoint admin server-side para usar service_role y no
    // depender de lo que permita RLS al cliente. Surface de errores reales.
    try {
      const { res, result } = await apiPost<{ error?: string }>(UPDATE_USER_URL, { id, activo: !activo })
      if (!res.ok) { mostrarMensaje(ERROR, result.error || t('admin.user.statusFailed')); return }
      setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: !activo } : u))
      mostrarMensaje(OK, t(activo ? 'admin.user.deactivated' : 'admin.user.activated'))
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : ''
      mostrarMensaje(ERROR, detail || t('admin.user.statusNetErr'))
    }
  }

  async function validarUsuario(id: string) {
    await usuariosRepo.validar(id)
    setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, validado: true, activo: true } : u))
    mostrarMensaje(OK, t('admin.user.validated'))
  }

  return { cambiarRol, toggleActivo, validarUsuario }
}
