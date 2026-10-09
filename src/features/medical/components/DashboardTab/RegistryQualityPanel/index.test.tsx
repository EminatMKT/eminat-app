import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RegistryQualityPanel from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))

const dataQuality = {
  missingEmail: 180,
  typoEmailDomain: null,
  repeatedName: null,
  sharedEmail: null,
  sharedPhone: null,
}

describe('RegistryQualityPanel', () => {
  it('shows the real missing-email count', () => {
    const html = renderToStaticMarkup(<RegistryQualityPanel dataQuality={dataQuality} />)
    expect(html).toContain('180')
  })

  it('marks the four not-yet-computed signals as unavailable instead of zero', () => {
    const html = renderToStaticMarkup(<RegistryQualityPanel dataQuality={dataQuality} />)
    expect(html.match(/—/g)?.length).toBe(4)
  })
})
