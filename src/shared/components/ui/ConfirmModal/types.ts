import type { ReactNode } from 'react'

export type Props = {
  title: string
  message: ReactNode
  confirmLabel: string
  /** `texto` only carries a value in `notaLabel` mode — the free-text note the person typed.
   *  Every existing caller ignores its own callback's parameters, so none of them break. */
  onConfirm: (texto?: string) => Promise<void> | void
  onClose: () => void
  /** Tiñe la acción de rojo: es la señal previa de que no tiene vuelta. */
  destructive?: boolean
  /** Si se pasa, el botón se habilita sólo al escribir este valor exacto. Para lo que no se
   *  puede deshacer Y afecta a otros: borrar un usuario con sus tareas, vaciar una tabla. */
  confirmPhrase?: string
  confirmPhraseLabel?: string
  /** If set instead of `confirmPhrase`, the same field asks for free text — any non-blank value
   *  enables the button, and `onConfirm` receives what was typed. The two are mutually exclusive:
   *  one dialog is never both "type this exact phrase" and "type any note". */
  notaLabel?: string
}
