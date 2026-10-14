const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Entry = { lillyUsuarioId: string; supabaseAuthId: string }

// This is a separate Production switch. A role grant or mapping row never enables QA.
export function salesQaAllowed(lillyUsuarioId: string, supabaseAuthId: string): boolean {
  if (process.env.ANNIE_SALES_QA_ENABLED !== 'true') return false
  if (!uuid.test(lillyUsuarioId) || !uuid.test(supabaseAuthId)) return false
  let entries: unknown
  try { entries = JSON.parse(process.env.ANNIE_SALES_QA_ALLOWLIST_JSON ?? '[]') }
  catch { return false }
  if (!Array.isArray(entries) || entries.length === 0) return false
  if (entries.some((entry: unknown) => !entry || typeof entry !== 'object' ||
    !uuid.test((entry as Entry).lillyUsuarioId ?? '') || !uuid.test((entry as Entry).supabaseAuthId ?? ''))) return false
  return entries.some((entry: Entry) =>
    entry.lillyUsuarioId === lillyUsuarioId && entry.supabaseAuthId === supabaseAuthId)
}
