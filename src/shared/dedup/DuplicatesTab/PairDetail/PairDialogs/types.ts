import type { I18nKey } from '@/shared/i18n'
import type { OpenDialog } from '../types'

/** The pair dialog's two secondary confirmations, and which one (if any) is open. */
export type Props = {
  dialog: OpenDialog
  onConfirmNote: (texto?: string) => void
  onConfirmDiscard: () => void
  onClose: () => void
}

/** The copy one secondary dialog shows; `noteKey` only on the one that asks for free text. */
export type DialogCopy = {
  titleKey: I18nKey
  messageKey: I18nKey
  confirmKey: I18nKey
  noteKey?: I18nKey
}
