import { escapeHtml } from '@/shared/utils/html'
import WELCOME_COPY from '@/server/mail/welcome/copy'
import type { WelcomeDetails } from '@/server/mail/welcome/types'

const LABEL = 'padding-top:18px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,0.45)'

/** The welcome email's credentials block: area (and cargo), email and temporary password. */
export default function details(person: WelcomeDetails): string {
  const {
    email,
    password,
    areaLabel,
    cargo,
  } = person
  const cargoLine = cargo ? `<div style="font-size:12px;color:#A5A7FF;margin-top:4px">${escapeHtml(cargo)}</div>` : ''
  const html = `
        <tr><td style="padding:0 36px">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="padding-top:14px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,0.45)">${WELCOME_COPY.area}</td></tr>
            <tr><td style="padding:4px 0 0;font-size:15px;color:#ffffff;font-weight:600">${escapeHtml(areaLabel)}${cargoLine}</td></tr>

            <tr><td style="${LABEL}">${WELCOME_COPY.email}</td></tr>
            <tr><td style="padding:4px 0 0;font-size:14px;color:#ffffff;font-family:'Courier New',monospace">${escapeHtml(email)}</td></tr>

            <tr><td style="${LABEL}">${WELCOME_COPY.password}</td></tr>
            <tr><td style="padding:6px 0 0">
              <div style="padding:14px 16px;background:#0A0A0F;border:1px solid rgba(124,58,237,0.45);border-radius:10px;font-family:'Courier New',monospace;font-size:18px;color:#ffffff;letter-spacing:.05em;text-align:center;font-weight:700">${escapeHtml(password)}</div>
            </td></tr>
            <tr><td style="padding:8px 0 0;font-size:11px;color:rgba(255,255,255,0.55)">${WELCOME_COPY.temporary}</td></tr>
          </table>
        </td></tr>
`
  return html
}

// Split from the email shell so each piece reads in one sitting; the markup is the one the
// route used to inline, unchanged.
