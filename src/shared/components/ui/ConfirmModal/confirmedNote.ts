/** The trimmed note to send, or `undefined` when there is nothing ready to confirm yet. */
export default function confirmedNote(notaLabel: string | undefined, typed: string): string | undefined {
  if (!notaLabel) return undefined
  const trimmed = typed.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
