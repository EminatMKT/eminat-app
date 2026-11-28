import { describe, expect, it } from 'vitest'
import type { I18nKey } from '@/shared/i18n'
import headerBlock from './index'
import { PRODUCTION_REPORT_DISCLAIMER, PRODUCTION_REPORT_SLOGAN } from '../disclaimer/constants'

const ORIGIN = 'https://app.example.test'
const LOGO = `${ORIGIN}/brand/stratix-communications.svg`
const LOGO_MARKER = `<img src="${LOGO}"`
const OTHER_ORIGIN = 'https://example.test/?a=1&b=2'
const ESCAPED_LOGO_PATH = '&amp;b=2/brand/stratix-communications.svg'
const LOGO_ALT_KEY: I18nKey = 'stratix.report.logoAlt'
const FAKE_ALT_TEXT = 'Fake Logo Alt Text'
const FAKE_ALT_ATTR = `alt="${FAKE_ALT_TEXT}"`
const UNEXPECTED_KEY_MARKER = 'unexpected-key:'
const OLD_HARDCODED_ALT_LITERAL = 'Stratix Communications'

// Fails loudly on an unexpected key instead of echoing it back, so a call to the wrong
// key (or no call at all, leaving the alt attribute empty) can't accidentally satisfy the
// assertions below by coincidence.
const t = (key: I18nKey) =>
  (key === LOGO_ALT_KEY ? FAKE_ALT_TEXT : `${UNEXPECTED_KEY_MARKER}${key}`)

const HOSTILE_ALT_TEXT = '<script>"&\'</script>'
const ESCAPED_HOSTILE_ALT_TEXT = '&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;'
const ESCAPED_HOSTILE_ALT_ATTR = `alt="${ESCAPED_HOSTILE_ALT_TEXT}"`
const tHostile = (key: I18nKey) => (key === LOGO_ALT_KEY ? HOSTILE_ALT_TEXT : key)

describe('headerBlock', () => {
  it('uses the origin-based logo before slogan and disclaimer', () => {
    const html = headerBlock(ORIGIN, t)

    expect(html).toContain(LOGO_MARKER)
    expect(html.indexOf(LOGO)).toBeLessThan(html.indexOf(PRODUCTION_REPORT_SLOGAN))
    expect(html.indexOf(PRODUCTION_REPORT_SLOGAN))
      .toBeLessThan(html.indexOf(PRODUCTION_REPORT_DISCLAIMER))
  })

  it('escapes the origin inside the image URL', () => {
    const html = headerBlock(OTHER_ORIGIN, t)

    expect(html).toContain(ESCAPED_LOGO_PATH)
  })

  it("builds the alt attribute from t(stratix.report.logoAlt), not a hardcoded literal", () => {
    const html = headerBlock(ORIGIN, t)

    expect(html).toContain(FAKE_ALT_ATTR)
    expect(html).not.toContain(OLD_HARDCODED_ALT_LITERAL)
    expect(html).not.toContain(UNEXPECTED_KEY_MARKER)
  })

  it('HTML-escapes whatever t returns before placing it in the alt attribute', () => {
    const html = headerBlock(ORIGIN, tHostile)

    expect(html).toContain(ESCAPED_HOSTILE_ALT_ATTR)
    expect(html).not.toContain(HOSTILE_ALT_TEXT)
  })
})
