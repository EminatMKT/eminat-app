'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { eligibleHeirs } from '../heirs'
import { apiPost } from '@/shared/api'
import Modal from '@/shared/components/Modal'
import ErrorBlock from './ErrorBlock'
import type { ReassignState } from '../types'

export default function DeleteUserModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { adminUsuarios, setAdminUsuarios, mostrarMensaje, border, t1, t2, t3, inputStyle } = useApp()
  const { t } = useT()
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
        setDeleteError(result.error || t('admin.del.failed'))
        setDeleting(false)
        return
      }
      setAdminUsuarios(prev => prev.filter(u => u.id !== id))
      onClose()
      const authBit = result.authDeleted ? t('admin.del.authBoth') : result.authNote ? t('admin.del.authNote', { note: result.authNote }) : t('admin.del.authNone')
      mostrarMensaje('ok', t('admin.del.deleted') + authBit)
    } catch (err: any) {
      setDeleteError(err?.message || t('admin.del.netErr'))
    }
    setDeleting(false)
  }

  async function ejecutarHerencia(oldId: string) {
    if (!reassignState) return
    setDeleteError(null)
    if (!reassignState.heirId) { setDeleteError(t('admin.del.pickHeir')); return }
    const heir = adminUsuarios.find(u => u.id === reassignState.heirId)
    if (!heir) { setDeleteError(t('admin.del.heirNotFound')); return }
    if (!heir.responsable_ref) { setDeleteError(t('admin.del.heirNoRef', { name: `${heir.nombre} ${heir.apellido}` })); return }
    setDeleting(true)
    try {
      const { res, result } = await apiPost('/api/admin/reassign-and-delete', { oldId, newId: heir.id, newRef: heir.responsable_ref, statusOverride: reassignState.statusOverride || null })
      if (!res.ok || !result.ok) { setDeleteError(result.error || t('admin.del.inheritFailed')); setDeleting(false); return }
      setAdminUsuarios(prev => prev.filter(u => u.id !== oldId))
      onClose()
      const heirName = `${heir.nombre} ${heir.apellido}`.trim()
      const count = result.transferred ?? 0
      mostrarMensaje('ok', count === 1 ? t('admin.del.inheritedOne', { count, name: heirName }) : t('admin.del.inheritedMany', { count, name: heirName }))
    } catch (err: any) {
      setDeleteError(err?.message || t('admin.del.inheritNetErr'))
    }
    setDeleting(false)
  }

  async function deactivarDesdeDelete(id: string) {
    setDeleteError(null)
    setDeleting(true)
    try {
      const { res, result } = await apiPost('/api/admin/update-user', { id, activo: false })
      if (!res.ok) { setDeleteError(result.error || t('admin.del.deactivateFailed')); setDeleting(false); return }
      setAdminUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: false } : u))
      onClose()
      mostrarMensaje('ok', t('admin.del.deactivated'))
    } catch (err: any) {
      setDeleteError(err?.message || t('admin.del.deactivateNetErr'))
    }
    setDeleting(false)
  }

  // ── FASE 2: Reasignar y borrar (tras un hard-delete bloqueado por FK)
  if (reassignState) {
    const heirs = eligibleHeirs(adminUsuarios, target)
    const selectedHeir = heirs.find(h => h.id === reassignState.heirId)
    const heirReady = !!selectedHeir && !!selectedHeir.responsable_ref
    const n = reassignState.taskCount
    return (
      <Modal title={t('admin.del.reassignTitle')} width={520} onClose={onClose}>
          <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 10, background: 'rgba(251,176,64,.08)', border: '1px solid rgba(251,176,64,.35)' }}>
            <div style={{ fontSize: 13, color: t1, fontWeight: 600 }}>{target.nombre} {target.apellido}</div>
            <div style={{ fontSize: 11, color: t2, marginTop: 4 }}>
              {n === 1 ? t('admin.del.hasTasksOne', { count: n }) : t('admin.del.hasTasksMany', { count: n })}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('admin.del.heirLabel')}</label>
            <select value={reassignState.heirId} onChange={e => setReassignState(s => s && { ...s, heirId: e.target.value })} style={inputStyle}>
              <option value="">{t('admin.del.selectMember')}</option>
              {heirs.length === 0 ? (
                <option value="" disabled>{t('admin.del.noMembers')}</option>
              ) : heirs.map(h => (
                <option key={h.id} value={h.id} disabled={!h.responsable_ref}>
                  {h.nombre} {h.apellido}{h.responsable_ref ? ` · ${h.responsable_ref}` : t('admin.del.notEligibleSuffix')}
                </option>
              ))}
            </select>
            {selectedHeir && !selectedHeir.responsable_ref && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#F87171' }}>
                {t('admin.del.heirNoRefHint1')} <code>responsable_ref</code> {t('admin.del.heirNoRefHint2')}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('admin.del.statusLabel')}</label>
            <select value={reassignState.statusOverride} onChange={e => setReassignState(s => s && { ...s, statusOverride: e.target.value as ReassignState['statusOverride'] })} style={inputStyle}>
              <option value="">{t('admin.del.statusKeep')}</option>
              <option value="aprobado">{t('admin.del.statusApproved')}</option>
              <option value="finalizado">{t('admin.del.statusFinalized')}</option>
              <option value="por_aprobar">{t('admin.del.statusPending')}</option>
            </select>
          </div>
          <div style={{ fontSize: 11, color: t3, marginBottom: 14, lineHeight: 1.5 }}>
            {t('admin.del.atomicNote')}
          </div>
          <ErrorBlock msg={deleteError} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} disabled={deleting} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>{t('common.cancel')}</button>
            <button onClick={() => ejecutarHerencia(target.id)} disabled={!heirReady || deleting} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: heirReady ? '#F87171' : '#9CA3AF', color: 'white', fontSize: 13, fontWeight: 600, cursor: heirReady ? 'pointer' : 'not-allowed' }}>
              {deleting ? '...' : (n === 1 ? t('admin.del.inheritBtnOne', { count: n }) : t('admin.del.inheritBtnMany', { count: n }))}
            </button>
          </div>
      </Modal>
    )
  }

  // ── FASE 1: Cancel / Deactivate (más seguro) / Hard delete
  return (
    <Modal width={440} onClose={onClose}>
        <div style={{ fontSize: 36, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
        <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: t1, marginBottom: 8, textAlign: 'center' }}>{t('admin.del.title')}</div>
        <div style={{ fontSize: 13, color: t2, marginBottom: 14, lineHeight: 1.5, textAlign: 'center' }}>
          <strong style={{ color: t1 }}>{target.nombre} {target.apellido}</strong><br />
          <span style={{ fontFamily: 'DM Mono', fontSize: 11 }}>{target.email}</span>
        </div>
        <div style={{ fontSize: 12, color: t2, marginBottom: 14, lineHeight: 1.5, padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.30)' }}>
          {t('admin.del.warnLead')} <code>public.usuarios</code> {t('admin.del.warnTail')}
        </div>
        <div style={{ fontSize: 11, color: t3, marginBottom: 18, lineHeight: 1.5 }}>
          {t('admin.del.hint')}
        </div>
        <ErrorBlock msg={deleteError} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} disabled={deleting} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>{t('common.cancel')}</button>
          <button onClick={() => deactivarDesdeDelete(userId)} disabled={deleting} style={{ flex: 1.3, padding: '10px', borderRadius: 10, border: '1px solid rgba(251,176,64,.35)', background: 'rgba(251,176,64,.10)', color: '#FBB040', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{deleting ? '...' : t('admin.del.deactivateBtn')}</button>
          <button onClick={() => eliminarUsuario(userId)} disabled={deleting} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#F87171', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{deleting ? '...' : t('admin.del.hardDelete')}</button>
        </div>
    </Modal>
  )
}
