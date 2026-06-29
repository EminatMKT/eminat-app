'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { generateTempPassword } from '../password'
import { apiPost } from '@/shared/api'
import Modal from '@/shared/components/Modal'
import PasswordInput from './PasswordInput'
import CredentialsPanel from './CredentialsPanel'
import ErrorBlock from './ErrorBlock'
import type { ResetTarget } from '../types'

export default function ResetPasswordModal({ target, onClose }: { target: ResetTarget; onClose: () => void }) {
  const { border, t1, t2, t3 } = useApp()
  const { t } = useT()
  const [resetPwd, setResetPwd] = useState(() => generateTempPassword())
  const [showResetPwd, setShowResetPwd] = useState(true)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<{ pwd: string; nombre: string } | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function ejecutarReset() {
    if (resetPwd.length < 8) { setResetError(t('admin.create.pwdMin')); return }
    setGuardando(true)
    setResetError(null)
    try {
      const { res, result } = await apiPost('/api/admin/reset-password', { userId: target.id, password: resetPwd })
      if (!res.ok) { setResetError(result.error || t('admin.reset.failed')); setGuardando(false); return }
      setResetSuccess({ pwd: resetPwd, nombre: target.nombre })
    } catch (err: any) {
      setResetError(err.message || t('admin.reset.netErr'))
    }
    setGuardando(false)
  }

  return (
    <Modal title={resetSuccess ? t('admin.reset.successTitle') : t('admin.reset.title')} width={460} onClose={onClose}>
        {resetSuccess ? (
          <CredentialsPanel label={t('admin.reset.newPwdFor', { name: resetSuccess.nombre })} name={resetSuccess.nombre} email={null} pwd={resetSuccess.pwd} onClose={onClose} />
        ) : (
          <>
            <ErrorBlock msg={resetError} />
            <div style={{ fontSize: 12, color: t2, marginBottom: 14, lineHeight: 1.5 }}>
              {t('admin.reset.intro')} <strong style={{ color: t1 }}>{target.nombre}</strong> ({target.email}). {t('admin.reset.introCont')}
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t('admin.reset.newPwdLabel')}</label>
              <PasswordInput value={resetPwd} onChange={setResetPwd} show={showResetPwd} setShow={setShowResetPwd} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>{t('common.cancel')}</button>
              <button onClick={ejecutarReset} disabled={guardando} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#60A5FA', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{guardando ? t('admin.reset.updating') : t('admin.reset.setNew')}</button>
            </div>
          </>
        )}
    </Modal>
  )
}
