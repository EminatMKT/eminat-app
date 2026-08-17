// Derivaciones puras del contador de seguimiento (`research_leads.email_count`).
// Sin React ni red: la UI (pop-up, KPI card) las consume, los tests las cubren.
import type { Lead } from '../types'

// Siguiente valor del contador al registrar un correo más. Un lead sin contador arranca en 1
// (el primer correo), no en 0 — null significa "todavía no se registró ninguno".
export const nextCount = (current: number | null | undefined): number => (current ?? 0) + 1

// Total de correos enviados en todos los leads: la card que Federico necesita para el 28/08,
// donde hoy solo se ven los 81 registros únicos y no los ~165–170 alcances reales.
export const totalEmails = (leads: Pick<Lead, 'email_count'>[]): number =>
  leads.reduce((sum, l) => sum + (l.email_count ?? 0), 0)
