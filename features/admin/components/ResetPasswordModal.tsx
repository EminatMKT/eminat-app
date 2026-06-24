'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { generateTempPassword } from '../password'
import { apiPost } from '@/shared/api'
import PasswordInput from './PasswordInput'
import CredentialsPanel from './CredentialsPanel'
import ErrorBlock from './ErrorBlock'
import type { ResetTarget } from '../types'

export default function ResetPasswordModal({ target, onClose }: { target: ResetTarget; onClose: () => void }) {
  const { s1, border, t1, t2, t3 } = useApp()
  const [resetPwd, setResetPwd] = useState(() => generateTempPassword())
  const [showResetPwd, setShowResetPwd] = useState(true)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<{ pwd: string; nombre: string } | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function ejecutarReset() {
    if (resetPwd.length < 8) { setResetError('La contraseña debe tener al menos 8 caracteres.'); return }
    setGuardando(true)
    setResetError(null)
    try {
      const { res, result } = await apiPost('/api/admin/reset-password', { userId: target.id, password: resetPwd })
      if (!res.ok) { setResetError(result.error || 'No se pudo actualizar la contraseña.'); setGuardando(false); return }
      setResetSuccess({ pwd: resetPwd, nombre: target.nombre })
    } catch (err: any) {
      setResetError(err.message || 'Error de red al actualizar la contraseña.')
    }
    setGuardando(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 460, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1 }}>{resetSuccess ? 'Contraseña actualizada' : 'Reset password'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t3, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        {resetSuccess ? (
          <CredentialsPanel label={`Nueva contraseña para ${resetSuccess.nombre}`} name={resetSuccess.nombre} email={null} pwd={resetSuccess.pwd} onClose={onClose} />
        ) : (
          <>
            <ErrorBlock msg={resetError} />
            <div style={{ fontSize: 12, color: t2, marginBottom: 14, lineHeight: 1.5 }}>
              Vas a establecer una nueva contraseña para <strong style={{ color: t1 }}>{target.nombre}</strong> ({target.email}). No podemos ver la contraseña anterior — esta la reemplaza por completo y te la mostramos para que se la entregues.
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>Nueva contraseña</label>
              <PasswordInput value={resetPwd} onChange={setResetPwd} show={showResetPwd} setShow={setShowResetPwd} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={ejecutarReset} disabled={guardando} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#60A5FA', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardando ? 'Updating...' : 'Set new password'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
