import { describe, expect, it } from 'vitest'
import headerBlock from './index'
import { PRODUCTION_REPORT_DISCLAIMER, PRODUCTION_REPORT_SLOGAN } from '../disclaimer/constants'

const ORIGIN = 'https://app.example.test'
const LOGO = `${ORIGIN}/brand/stratix-communications.svg`
const LOGO_MARKER = `<img src="${LOGO}"`
const OTHER_ORIGIN = 'https://example.test/?a=1&b=2'
const ESCAPED_LOGO_PATH = '&amp;b=2/brand/stratix-communications.svg'

describe('headerBlock', () => {
  it('uses the origin-based logo before slogan and disclaimer', () => {
    const html = headerBlock(ORIGIN)
    expect(html).toContain(LOGO_MARKER)
    expect(html.indexOf(LOGO)).toBeLessThan(html.indexOf(PRODUCTION_REPORT_SLOGAN))
    expect(html.indexOf(PRODUCTION_REPORT_SLOGAN))
      .toBeLessThan(html.indexOf(PRODUCTION_REPORT_DISCLAIMER))
  })

  it('escapes the origin inside the image URL', () => {
    const html = headerBlock(OTHER_ORIGIN)
    expect(html).toContain(ESCAPED_LOGO_PATH)
  })
})
