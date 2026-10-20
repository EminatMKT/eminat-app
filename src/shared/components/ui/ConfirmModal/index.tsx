'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import Modal from '@/shared/components/ui/Modal'
import Button from '@/shared/components/ui/Button'
import Field from '@/shared/components/ui/Field'
import fieldPrompt from './fieldPrompt'
import confirmedNote from './confirmedNote'
import type { Props } from './types'
import s from './index.module.css'

const SIN_TEXTO = ''
const ESTADO_INICIAL = { typed: SIN_TEXTO, busy: false }

// centinela-exime: bloques-similares@3 — no hay markup nuevo: los botones son `Button` y el pie
// es el `footer` de `Modal`. Antes se dibujaban acá con `style` inline y la paleta a mano.
// centinela-exime: useState@1 — lo que se tipea y lo que "está corriendo" no viajan juntos: uno
// cambia con el teclado y el otro con la red.
export default function ConfirmModal(props: Props) {
  // Nueve props no entran en la firma sin volverla un párrafo (rules/codigo.md).
  const { title, message, confirmLabel, onConfirm, onClose, destructive } = props
  const { confirmPhrase, confirmPhraseLabel, notaLabel } = props
  const { t } = useT()
  // Lo que se tipea y si hay una llamada en curso viven en UN objeto: dos campos de la misma
  // pantalla, no dos vidas independientes.
  const [estado, setEstado] = useState(ESTADO_INICIAL)
  const { typed, busy } = estado
  // The two fields are mutually exclusive, so each check is vacuously true when its own prop is
  // absent — `listo` only ever depends on whichever one the caller actually passed.
  const fraseOk = !confirmPhrase || typed.trim().toLowerCase() === confirmPhrase.trim().toLowerCase()
  const text = confirmedNote(notaLabel, typed)
  const noteOk = !notaLabel || text !== undefined
  const listo = fraseOk && noteOk
  const setTyped = (valor: string) => setEstado(p => ({ ...p, typed: valor }))

  async function ejecutar() {
    if (!listo || busy) return
    setEstado(p => ({ ...p, busy: true }))
    try { await onConfirm(text) } finally { setEstado(p => ({ ...p, busy: false })) }
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
    <Modal title={title} role="alertdialog" anchoRem={27.5} onClose={onClose} footer={acciones}>
      <div className={s.mensaje}>{message}</div>
      {(confirmPhrase || notaLabel) && (
        <Field label={fieldPrompt(confirmPhrase, confirmPhraseLabel, notaLabel, t)}>
          <input value={typed} autoFocus placeholder={confirmPhrase} className={s.frase}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void ejecutar()} />
        </Field>
      )}
    </Modal>
  )
}
