import type { DialogCopy } from './types'

/** "Keep separate": the same question as always, plus the note it records. */
export const NOTE_COPY: DialogCopy = {
  titleKey: 'dedup.sameSeparated',
  messageKey: 'dedup.sameSeparatedMessage',
  confirmKey: 'dedup.sameSeparated',
  noteKey: 'dedup.separatedNotePrompt',
}

/** "Discard your choices?": asked before a close would lose picks or unchecked values. */
export const DISCARD_COPY: DialogCopy = {
  titleKey: 'dedup.discardChoicesTitle',
  messageKey: 'dedup.discardChoicesMessage',
  confirmKey: 'dedup.discardChoicesConfirm',
}
