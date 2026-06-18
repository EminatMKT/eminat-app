'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { eligibleHeirs } from '../heirs'
import { apiPost } from '../api'
import ErrorBlock from './ErrorBlock'
import type { ReassignState } from '../types'

export default function DeleteUserModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { adminUsuarios, setAdminUsuarios, mostrarMensaje, s1, border, t1, t2, t3, inputStyle } = useApp()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [reassignState, setReassignState] = useState<ReassignState | null>(null)

  const target = adminUsuarios.find(u => u.id === userId)
  if (!target) return null

  async function eliminarUsuario(id: string) {
    setDeleteError(null)
    setDeleting(true)
    try {
      const { res, result } = await apiPost('/api/admin/delete-user', { id })
      if (!res.ok || !result.ok) {
        // Si el fallo es FK constraint, surface la cantidad de tareas que bloquean
        // y flip a la UI de reasignar para transferir en vez de solo bloquear.
        if (res.status === 409 && result.blockedBy === 'foreign_key') {
          setReassignState({ taskCount: result.taskCount ?? 0, heirId: '', statusOverride: '' })
          setDeleteError(result.error || null)
          setDeleting(false)
          return
        }
        setDeleteError(result.error || 'No se pudo borrar el usuario.')
        setDeleting(false)
        return
      }
      setAdminUsuarios(prev => prev.filter(u => u.id !== id))
      onClose()
      const authBit = result.authDeleted ? ' (Auth + perfil)' : result.authNote ? ' (perfil borrado; Auth: ' + result.authNote + ')' : ' (perfil borrado; sin cuenta Auth)'
      mostrarMensaje('ok', `User deleted${authBit}`)
    } catch (err: any) {
      setDeleteError(err?.message || 'Error de red al borrar el usuario.')
    }
    setDeleting(false)
  }

  async function ejecutarHerencia(oldId: string) {
    if (!reassignState) return
    setDeleteError(null)
    if (!reassignState.heirId) { setDeleteError('Selecciona quién hereda las tareas.'); return }
    const heir = adminUsuarios.find(u => u.id === reassignState.heirId)
    if (!heir) { setDeleteError('Nuevo dueño no encontrado.'); return }
    if (!heir.responsable_ref) { setDeleteError(`${heir.nombre} ${heir.apellido} no tiene responsable_ref configurado y no puede heredar tareas.`); return }
    setDeleting(true)
    try {
      const { res, result } = await apiPost('/api/admin/reassign-and-delete', { oldId, newId: heir.id, newRef: heir.responsable_ref, statusOverride: reassignState.statusOverride || null })
      if (!res.ok || !result.ok) { setDeleteError(result.error || 'No se pudo heredar y borrar.'); setDeleting(false); return }
      setAdminUsuarios(prev => prev.filter(u => u.id !== oldId))
      onClose()
      const heirName = `${heir.nombre} ${heir.apellido}`.trim()
      const count = result.transferred ?? 0
      const tail = count === 1 ? 'tarea heredada' : 'tareas heredadas'
      mostrarMensaje('ok', `${count} ${tail} a ${heirName}. Usuario borrado.`)
    } catch (err: any) {
      setDeleteError(err?.message || 'Error de red al heredar.')
    }
    setDeleting(false)
  }

  async function deactivarDesdeDelete(id: string) {
    setDeleteError(null)
    setDeleting(true)
    try {
      const { res, result } = await apiPost('/api/admin/update-user', { id, activo: false })
      if (!res.ok) { setDeleteError(result.error || 'No se pudo desactivar el usuario.'); setDeleting(false); return }
      setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: false } : u))
      onClose()
      mostrarMensaje('ok', 'User deactivated (activo=false). Su historial se preserva.')
    } catch (err: any) {
      setDeleteError(err?.message || 'Error de red al desactivar el usuario.')
    }
    setDeleting(false)
  }

  // ── FASE 2: Reasignar y borrar (tras un hard-delete bloqueado por FK)
  if (reassignState) {
    const heirs = eligibleHeirs(adminUsuarios, target)
    const selectedHeir = heirs.find(h => h.id === reassignState.heirId)
    const heirReady = !!selectedHeir && !!selectedHeir.responsable_ref
    const taskWord = reassignState.taskCount === 1 ? 'tarea asignada' : 'tareas asignadas'
    const btnWord = reassignState.taskCount === 1 ? 'tarea' : 'tareas'
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
        <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>Reasignar y borrar</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 10, background: 'rgba(251,176,64,.08)', border: '1px solid rgba(251,176,64,.35)' }}>
            <div style={{ fontSize: 13, color: t1, fontWeight: 600 }}>{target.nombre} {target.apellido}</div>
            <div style={{ fontSize: 11, color: t2, marginTop: 4 }}>
              Tiene <strong style={{ color: '#FBB040' }}>{reassignState.taskCount}</strong> {taskWord}. Transfiérelas a otro miembro activo del mismo área para poder borrarlo.
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Heredadas por…</label>
            <select value={reassignState.heirId} onChange={e => setReassignState(s => s && { ...s, heirId: e.target.value })} style={inputStyle}>
              <option value="">— Selecciona un miembro —</option>
              {heirs.length === 0 ? (
                <option value="" disabled>No hay miembros activos en el mismo rol</option>
              ) : heirs.map(h => (
                <option key={h.id} value={h.id} disabled={!h.responsable_ref}>
                  {h.nombre} {h.apellido}{h.responsable_ref ? ` · ${h.responsable_ref}` : ' (sin responsable_ref — no elegible)'}
                </option>
              ))}
            </select>
            {selectedHeir && !selectedHeir.responsable_ref && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#F87171' }}>
                Este miembro no tiene <code>responsable_ref</code> configurado. Edítalo primero o elige a alguien más.
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Estado nuevo (aplica a TODAS las tareas heredadas)</label>
            <select value={reassignState.statusOverride} onChange={e => setReassignState(s => s && { ...s, statusOverride: e.target.value as ReassignState['statusOverride'] })} style={inputStyle}>
              <option value="">(no cambiar) — cada tarea conserva su estado actual</option>
              <option value="aprobado">Aprobado — estado: Completado · verificado: Aprobado</option>
              <option value="finalizado">Finalizado — estado: Completado · verificado sin cambio</option>
              <option value="por_aprobar">Por aprobar — estado: Por aprobar · verificado sin cambio</option>
            </select>
          </div>
          <div style={{ fontSize: 11, color: t3, marginBottom: 14, lineHeight: 1.5 }}>
            Atómico — la herencia, la limpieza de notificaciones, y el borrado de la cuenta corren en una sola transacción. Si algo falla, todo se rollback-ea y no se pierde ninguna tarea.
          </div>
          <ErrorBlock msg={deleteError} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} disabled={deleting} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => ejecutarHerencia(target.id)} disabled={!heirReady || deleting} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: heirReady ? '#F87171' : '#9CA3AF', color: 'white', fontSize: 13, fontWeight: 600, cursor: heirReady ? 'pointer' : 'not-allowed' }}>
              {deleting ? '...' : `Heredar ${reassignState.taskCount} ${btnWord} y borrar usuario`}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── FASE 1: Cancel / Deactivate (más seguro) / Hard delete
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 440, maxWidth: '95vw' }}>
        <div style={{ fontSize: 36, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
        <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: t1, marginBottom: 8, textAlign: 'center' }}>Delete user</div>
        <div style={{ fontSize: 13, color: t2, marginBottom: 14, lineHeight: 1.5, textAlign: 'center' }}>
          <strong style={{ color: t1 }}>{target.nombre} {target.apellido}</strong><br />
          <span style={{ fontFamily: 'DM Mono', fontSize: 11 }}>{target.email}</span>
        </div>
        <div style={{ fontSize: 12, color: t2, marginBottom: 14, lineHeight: 1.5, padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.30)' }}>
          Esta acción borra el row de <code>public.usuarios</code> Y la cuenta de Auth (si existe). Es permanente.
        </div>
        <div style={{ fontSize: 11, color: t3, marginBottom: 18, lineHeight: 1.5 }}>
          Si tiene actividades, te abriré un panel para <strong style={{ color: t2 }}>heredarlas</strong> a otro miembro antes de borrar. Si prefieres preservar todo intacto y solo quitarle acceso, usa <strong style={{ color: t2 }}>Deactivate</strong>.
        </div>
        <ErrorBlock msg={deleteError} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} disabled={deleting} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => deactivarDesdeDelete(userId)} disabled={deleting} style={{ flex: 1.3, padding: '10px', borderRadius: 10, border: '1px solid rgba(251,176,64,.35)', background: 'rgba(251,176,64,.10)', color: '#FBB040', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{deleting ? '...' : 'Deactivate (safer)'}</button>
          <button onClick={() => eliminarUsuario(userId)} disabled={deleting} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#F87171', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{deleting ? '...' : 'Hard delete'}</button>
        </div>
      </div>
    </div>
  )
}
