import { escapeHtml } from '@/shared/utils'
import { REPORT_APPROVER_NAME, REPORT_APPROVER_TITLE } from '../disclaimer.constants'

/** Report signature footer; the approver is the tracked exception in disclaimer.constants.ts. */
export default function signatureBlock(nombre: string): string {
  const left = `<div style="text-align:center"><div style="border-top:1px solid #333;padding-top:10px;font-size:12px;font-weight:600">${escapeHtml(nombre)}</div><div style="font-size:10px;color:#888;margin-top:2px">Miembro del equipo</div></div>`
  const right = `<div style="text-align:center"><div style="border-top:1px solid #333;padding-top:10px;font-size:12px;font-weight:600">${REPORT_APPROVER_NAME}</div><div style="font-size:10px;color:#888;margin-top:2px">${REPORT_APPROVER_TITLE}</div></div>`

  return `<div class="report-signatures" style="margin-top:60px;padding-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:80px;break-inside:avoid;page-break-inside:avoid">${left}${right}</div>`
}

// Builds the printed report's fixed approval footer: the given team member on the left, the
// tracked AGENTS.md exception's hardcoded approver on the right (see disclaimer.constants.ts).
