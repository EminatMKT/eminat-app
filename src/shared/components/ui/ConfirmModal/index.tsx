'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import Modal from '@/shared/components/ui/Modal'
import Button from '@/shared/components/ui/Button'
import Field from '@/shared/components/ui/Field'
import type { Props } from './types'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — no hay markup nuevo: los botones son `Button` y el pie
// es el `footer` de `Modal`. Antes se dibujaban acá con `style` inline y la paleta a mano.
// centinela-exime: useState@1 — lo que se tipea y lo que "está corriendo" no viajan juntos: uno
// cambia con el teclado y el otro con la red.
export default function ConfirmModal(props: Props) {
  // Ocho props no entran en la firma sin volverla un párrafo (rules/codigo.md).
  const { title, message, confirmLabel, onConfirm, onClose, destructive, confirmPhrase, confirmPhraseLabel } = props
  const { t } = useT()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const listo = !confirmPhrase || typed.trim().toLowerCase() === confirmPhrase.trim().toLowerCase()

  async function ejecutar() {
    if (!listo || busy) return
    setBusy(true)
    try { await onConfirm() } finally { setBusy(false) }
  }

  // `deshabilitado`, no `ocupado`, sin la frase: el rótulo sigue diciendo qué va a pasar.
  const acciones = (
    <>
      <Button kind="cancel" onClick={onClose} />
      <Button kind={destructive ? 'delete' : 'confirm'} label={confirmLabel}
        onClick={ejecutar} ocupado={busy} deshabilitado={!listo} />
    </>
  )

  return (
    <Modal title={title} anchoRem={27.5} onClose={onClose} footer={acciones}>
      <div className={s.mensaje}>{message}</div>
      {confirmPhrase && (
        <Field label={confirmPhraseLabel ?? t('common.confirmPhrase', { frase: confirmPhrase })}>
          <input value={typed} autoFocus placeholder={confirmPhrase} className={s.frase}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void ejecutar()} />
        </Field>
      )}
    </Modal>
  )
}
