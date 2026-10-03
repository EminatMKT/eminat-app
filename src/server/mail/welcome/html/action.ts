import { MARKETING_INBOX_EMAIL } from '@/shared/constants/contacts'
import WELCOME_COPY from '../copy'

const LOGIN_URL = 'https://app.stratixsolutions.us'

/** The welcome email's closing: the button into the app and the footer with the contact inbox. */
export default function action(): string {
  const html = `
        <tr><td align="center" style="padding:28px 36px">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="background:#4F46E5;border-radius:999px">
              <a href="${LOGIN_URL}" style="display:inline-block;padding:14px 30px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">${WELCOME_COPY.button}</a>
            </td></tr>
          </table>
          <div style="margin-top:14px;font-size:12px;color:rgba(255,255,255,0.45)">${LOGIN_URL}</div>
        </td></tr>

        <tr><td style="padding:22px 36px;border-top:1px solid rgba(255,255,255,0.07);font-size:11px;color:rgba(255,255,255,0.4);text-align:center;line-height:1.6">
          ${WELCOME_COPY.tagline}<br/>
          ${WELCOME_COPY.unexpected} ${MARKETING_INBOX_EMAIL}
        </td></tr>
`
  return html
}

// The markup the create-user route used to inline, unchanged.
