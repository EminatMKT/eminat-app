'use client'
import { useT } from '@/shared/i18n'
import { ConfirmModal } from '@/shared/components/ui'
import { NOTE_DIALOG } from '../constants'
import { DISCARD_COPY, NOTE_COPY } from './constants'
import type { Props } from './types'

/** The secondary question on top of the open pair — the "keep separate" note, or "discard your
 *  choices?" — or nothing while neither is open. */
export default function PairDialogs({
  dialog,
  onConfirmNote,
  onConfirmDiscard,
  onClose,
}: Props) {
  const { t } = useT()
  if (!dialog) return null
  const isNote = dialog === NOTE_DIALOG
  const {
    titleKey,
    messageKey,
    confirmKey,
    noteKey,
  } = isNote ? NOTE_COPY : DISCARD_COPY
  const noteLabel = noteKey && t(noteKey)

  return (
    <ConfirmModal
      title={t(titleKey)}
      message={t(messageKey)}
      confirmLabel={t(confirmKey)}
      notaLabel={noteLabel}
      onConfirm={isNote ? onConfirmNote : onConfirmDiscard}
      onClose={onClose}
    />
  )
}

// One `ConfirmModal` call fed by a copy table, so the two dialogs cannot drift apart. They are
// siblings of the pair's `Modal`, not children, so its scrolling box never clips them.
