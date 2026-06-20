import { useApp } from '@/shared/context/AppContext'
import { usuariosRepo } from '@/shared/data'
import { apiPost } from '../api'

// Acciones por fila que mutan adminUsuarios in-place (rol, activación, validación).
export function useUserActions() {
  const { setAdminUsuarios, mostrarMensaje } = useApp()

  async function cambiarRol(id: string, rol: string) {
    const { error } = await usuariosRepo.updateRol(id, rol)
    if (error) { mostrarMensaje('error', `Role: ${error.message}`); return }
    setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, rol } : u))
    mostrarMensaje('ok', 'Role updated')
  }

  async function toggleActivo(id: string, activo: boolean) {
    // Ruteado por el endpoint admin server-side para usar service_role y no
    // depender de lo que permita RLS al cliente. Surface de errores reales.
    try {
      const { res, result } = await apiPost('/api/admin/update-user', { id, activo: !activo })
      if (!res.ok) { mostrarMensaje('error', result.error || 'No se pudo cambiar el estado.'); return }
      setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: !activo } : u))
      mostrarMensaje('ok', !activo ? 'User activated' : 'User deactivated')
    } catch (err: any) {
      mostrarMensaje('error', err?.message || 'Error de red al cambiar el estado.')
    }
  }

  async function validarUsuario(id: string) {
    await usuariosRepo.validar(id)
    setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, validado: true, activo: true } : u))
    mostrarMensaje('ok', 'User validated')
  }

  return { cambiarRol, toggleActivo, validarUsuario }
}
