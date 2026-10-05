import { escapeHtml } from '@/shared/utils/html'
import WELCOME_COPY from '../copy'
import type { WelcomeArgs } from '../types'
import details from './details'
import action from './action'

/** The welcome email's whole HTML document: shell and greeting around the credentials and the action. */
export default function buildWelcomeEmail(args: WelcomeArgs): string {
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${WELCOME_COPY.subject}</title>
</head>
<body style="margin:0;padding:0;background:#09090B;font-family:'Helvetica Neue',Arial,sans-serif;color:#ffffff;-webkit-text-size-adjust:100%">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090B">
    <tr><td align="center" style="padding:40px 16px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:#13131C;border:1px solid rgba(255,255,255,0.07);border-radius:18px;overflow:hidden">

        <tr><td style="background:#4F46E5;padding:34px 36px">
          <div style="font-size:11px;font-weight:700;letter-spacing:.22em;color:rgba(255,255,255,0.75);text-transform:uppercase">${WELCOME_COPY.brand}</div>
          <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-.01em;margin-top:6px">${WELCOME_COPY.greeting}, ${escapeHtml(args.nombre)}</div>
        </td></tr>

        <tr><td style="padding:28px 36px 8px;color:rgba(255,255,255,0.82);font-size:14px;line-height:1.6">
          <p style="margin:0 0 12px">${WELCOME_COPY.intro}</p>
        </td></tr>
${details(args)}${action()}
      </table>
    </td></tr>
  </table>
</body>
</html>`
  return html
}

// The document the create-user route used to inline, split into shell, credentials and action
// so each file reads in one sitting.
