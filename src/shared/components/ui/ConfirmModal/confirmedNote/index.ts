/** The trimmed note to send, or `undefined` when there is nothing ready to confirm yet. */
export default function confirmedNote(notaLabel: string | undefined, typed: string): string | undefined {
  if (!notaLabel) return undefined
  const trimmed = typed.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

// ConfirmModal's note gate: a dialog without a note field sends nothing, and one with it only
// sends what the user typed once trimmed, so a blank or whitespace-only note never confirms.
