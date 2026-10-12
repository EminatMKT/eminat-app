export type ReportRecipientCandidate = { name: string; email: string | null | undefined }

/** Attendance belongs in the PDF; it must never restrict delivery of the minutes. */
export function resolveReportRecipients(candidates: ReportRecipientCandidate[], locale: 'es' | 'en') {
  const recipients = new Map<string, { name: string; email: string }>()
  const omitted: { name: string; reason: string }[] = []
  for (const candidate of candidates) {
    const email = candidate.email?.trim().toLowerCase() ?? ''
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      omitted.push({
        name: candidate.name,
        reason: !email
          ? (locale === 'en' ? 'No email available' : 'Sin correo disponible')
          : (locale === 'en' ? 'Invalid email' : 'Correo inválido'),
      })
    } else if (!recipients.has(email)) {
      recipients.set(email, { name: candidate.name, email })
    }
  }
  return { recipients: Array.from(recipients.values()), omitted }
}
