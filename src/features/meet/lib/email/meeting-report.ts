import type { MeetingReportData } from '@/features/meet/lib/pdf/meeting-report'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function buildMeetingReportEmail(report: MeetingReportData) {
  const english = report.locale === 'en'
  const subject = english ? `Meeting minutes: ${report.title}` : `Acta de reunión: ${report.title}`
  const participants = [...report.attendees, ...report.externalGuests].map((person) => person.name).join(', ') || (english ? 'No attendees recorded' : 'Sin asistentes registrados')
  const rows = [
    [english ? 'Meeting' : 'Reunión', report.title],
    [english ? 'Company' : 'Empresa', report.company || (english ? 'Not registered' : 'No registrada')],
    [english ? 'Date' : 'Fecha', report.date],
    [english ? 'Time' : 'Hora', [report.startTime, report.endTime].filter(Boolean).join(' – ') || (english ? 'Not registered' : 'No registrada')],
    [english ? 'Attendees' : 'Participantes', participants],
  ]
  const tableRows = rows.map(([label, value]) => `<tr><td style="padding:8px 0;width:120px;color:#5f7168;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.45px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:8px 0;color:#163c2b;font-size:14px;line-height:21px">${escapeHtml(value)}</td></tr>`).join('')
  const intro = english ? 'The institutional meeting minutes are attached as a PDF.' : 'El acta institucional de la reunión se encuentra adjunta en formato PDF.'
  const html = `<!doctype html><html><body style="margin:0;background:#eff8f2;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #d7ebde;border-radius:18px;overflow:hidden"><tr><td style="padding:28px 32px;background:linear-gradient(135deg,#0b6b43,#15965f);color:#fff"><div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;opacity:.85">Stratix Meet</div><div style="margin-top:8px;font-size:25px;font-weight:700">${english ? 'Meeting minutes' : 'Acta de reunión'}</div></td></tr><tr><td style="padding:34px 32px"><p style="margin:0 0 20px;color:#294b3b;font-size:15px;line-height:24px">${intro}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4fbf6;border:1px solid #d7ebde;border-radius:12px;padding:14px 20px">${tableRows}</table><p style="margin:24px 0 0;color:#5f7168;font-size:13px;line-height:20px">${english ? 'This is an automated notification from Stratix Meet.' : 'Esta es una notificación automática de Stratix Meet.'}</p></td></tr><tr><td style="padding:20px 32px;background:#0d3d29;color:#d8f3e2;font-size:12px">Stratix Meet · notifications@stratixsolutions.us</td></tr></table></td></tr></table></body></html>`
  const text = rows.map(([label, value]) => `${label}: ${value}`).concat('', intro, '', 'Stratix Meet · notifications@stratixsolutions.us').join('\n')
  return { subject, html, text }
}
