import { escapeHtml } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import logoUrl from '../logo-url'
import { PRODUCTION_REPORT_DISCLAIMER, PRODUCTION_REPORT_SLOGAN } from '../disclaimer/constants'
import { LOGO_STYLE, SLOGAN_STYLE, WRAPPER_STYLE } from './constants'

export default function headerBlock(origin: string, t: (key: I18nKey) => string): string {
  const alt = escapeHtml(t('stratix.report.logoAlt'))
  const logo = `<img src="${escapeHtml(logoUrl(origin))}" alt="${alt}"`
  const image = `${logo} width="176" height="59" style="${LOGO_STYLE}" />`
  const slogan = `<div style="${SLOGAN_STYLE}">${PRODUCTION_REPORT_SLOGAN}</div>`
  const disclaimer = '<p style="font-size:12px;margin-top:10px;color:#111">'
  const note = `${disclaimer}${PRODUCTION_REPORT_DISCLAIMER}</p>`
  const html = `<div style="${WRAPPER_STYLE}">${image}${slogan}${note}</div>`

  return html
}

// Renders the report's branded header using the caller's origin for the logo URL.
