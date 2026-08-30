import type { ReactNode } from 'react'

export type Props = {
  title: string
  message: ReactNode
  confirmLabel: string
  onConfirm: () => Promise<void> | void
  onClose: () => void
  /** Tiñe la acción de rojo: es la señal previa de que no tiene vuelta. */
  destructive?: boolean
  /** Si se pasa, el botón se habilita sólo al escribir este valor exacto. Para lo que no se
   *  puede deshacer Y afecta a otros: borrar un usuario con sus tareas, vaciar una tabla. */
  confirmPhrase?: string
  confirmPhraseLabel?: string
}
