'use client'
import { useState, type ReactNode } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import Modal from './Modal'

// Confirmación reutilizable: título + mensaje + acción, con variante destructiva y un
// modo opcional type-to-confirm (escribir un valor exacto para habilitar el botón).
// Cada acción solo CONFIGURA este modal; no se crean modales por acción.
type Props = {
  title: string
  message: ReactNode
  confirmLabel: string
  onConfirm: () => Promise<void> | void
  onClose: () => void
  destructive?: boolean
  confirmPhrase?: string       // si se pasa, el botón se habilita solo al tipearlo exacto
  confirmPhraseLabel?: string  // etiqueta del input de type-to-confirm
}

export default function ConfirmModal({ title, message, confirmLabel, onConfirm, onClose, destructive, confirmPhrase, confirmPhraseLabel }: Props) {
  const { border, t2, t3, accent, inputStyle } = useApp()
  const { t } = useT()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const phraseOk = !confirmPhrase || typed.trim().toLowerCase() === confirmPhrase.trim().toLowerCase()
  const ready = phraseOk && !busy
  const color = destructive ? '#F87171' : accent

  async function run() {
    if (!ready) return
    setBusy(true)
    try { await onConfirm() } finally { setBusy(false) }
  }

  return (
    <Modal title={title} width={440} onClose={onClose}>
      <div style={{ fontSize: 13, color: t2, marginBottom: confirmPhrase ? 14 : 20, lineHeight: 1.5 }}>{message}</div>
      {confirmPhrase && (
        <div style={{ marginBottom: 18 }}>
          {confirmPhraseLabel && <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{confirmPhraseLabel}</label>}
          <input
            value={typed}
            onChange={e => setTyped(e.target.value)}
            autoFocus
            placeholder={confirmPhrase}
            style={{ ...inputStyle, fontFamily: 'DM Mono, monospace' }}
            onKeyDown={e => { if (e.key === 'Enter') run() }}
          />
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>{t('common.cancel')}</button>
        <button onClick={run} disabled={!ready} style={{ flex: 1.4, padding: '10px', borderRadius: 10, border: 'none', background: ready ? color : '#9CA3AF', color: 'white', fontSize: 13, fontWeight: 600, cursor: ready ? 'pointer' : 'not-allowed' }}>{busy ? '...' : confirmLabel}</button>
      </div>
    </Modal>
  )
}
