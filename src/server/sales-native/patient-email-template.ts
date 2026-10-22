const portal = 'https://portal.corazonsalud.health'
const logo = `${portal}/corazon-salud.svg`
const emc = `${portal}/emc_logo_white.svg`
const cori = `${portal}/cori-official.png`

export type PatientEmail = {
  title: string
  message: string
  actionLabel: string
  actionUrl: string
  details?: ReadonlyArray<{ label: string; value: string }>
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!)

export function renderPatientEmail(input: PatientEmail) {
  const title = escapeHtml(input.title)
  const message = escapeHtml(input.message)
  const actionLabel = escapeHtml(input.actionLabel)
  const actionUrl = new URL(input.actionUrl)
  if (actionUrl.protocol !== 'https:' || actionUrl.username || actionUrl.password || !(
    ['portal.corazonsalud.health', 'ruedelunbtaomhrzgelc.supabase.co'].includes(actionUrl.hostname) ||
    (actionUrl.hostname === 'connect.intuit.com' && actionUrl.pathname.startsWith('/t/'))
  ))
    throw new Error('PATIENT_EMAIL_LINK_INVALID')
  const rows = (input.details ?? []).map(({ label, value }) =>
    `<tr><td style="padding:7px 0;color:#59717b">${escapeHtml(label)}</td><td style="padding:7px 0;text-align:right;font-weight:700;color:#193b48">${escapeHtml(value)}</td></tr>`).join('')
  const html = `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f6f9fa;font-family:Arial,Helvetica,sans-serif;color:#193b48"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f6f9fa"><tr><td align="center" style="padding:24px 12px"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:white;border-radius:18px;overflow:hidden"><tr><td style="padding:30px 32px 24px;border-top:6px solid #ec3980"><img src="${logo}" alt="Corazón Salud" width="180" style="display:block;max-width:100%"></td></tr><tr><td style="padding:0 32px 30px"><h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;color:#183b49">${title}</h1><p style="font-size:16px;line-height:1.55;margin:0 0 18px">${message}</p>${rows ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e5edef;border-bottom:1px solid #e5edef;margin:0 0 22px">${rows}</table>` : ''}<a href="${escapeHtml(actionUrl.toString())}" style="display:inline-block;background:#e9327b;color:white;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:28px">${actionLabel}</a></td></tr><tr><td style="padding:0 32px 25px"><img src="${cori}" alt="Cori" width="100" style="display:block;max-width:100%;height:auto"></td></tr><tr><td style="background:#173d4d;padding:20px 32px"><img src="${emc}" alt="Eminat Medical Center" width="92" style="display:block;max-width:100%"><p style="font-size:12px;line-height:1.5;color:white;margin:12px 0 0">Corazón Salud es un programa de Eminat Medical Center.<br>Corazón Salud no es un seguro médico.</p></td></tr></table></td></tr></table></body></html>`
  return { html, text: `${input.title}\n\n${input.message}\n\n${(input.details ?? []).map(row => `${row.label}: ${row.value}`).join('\n')}\n\n${input.actionLabel}: ${actionUrl}\n\nCorazón Salud es un programa de Eminat Medical Center.\nCorazón Salud no es un seguro médico.` }
}
