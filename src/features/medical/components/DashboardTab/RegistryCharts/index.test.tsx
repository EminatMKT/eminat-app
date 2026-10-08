import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RegistryCharts from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))

const counts = {
  gender: { female: 260, male: 230, unknown: 10 },
  ageBuckets: {
    child: 40,
    youngAdult: 150,
    adult: 180,
    olderAdult: 90,
    senior: 40,
    unknown: 0,
  },
  areaCodes: [{ code: '305', label: 'Miami-Dade', count: 220 }],
}

describe('RegistryCharts', () => {
  it('shows an unavailable note for birthdays instead of a fake chart', () => {
    const html = renderToStaticMarkup(<RegistryCharts counts={counts} />)
    expect(html).toContain('med.dashboardUnavailable')
  })

  it('drops the unknown-gender slice once nobody is in it', () => {
    const noUnknown = { ...counts, gender: { female: 260, male: 230, unknown: 0 } }
    const html = renderToStaticMarkup(<RegistryCharts counts={noUnknown} />)
    expect(html).not.toContain('med.dashboardGenderUnknown')
  })

  it('renders the area-code chart instead of the no-data panel when codes exist', () => {
    const html = renderToStaticMarkup(<RegistryCharts counts={counts} />)
    expect(html).toContain('med.dashboardAreaCodes')
    expect(html).not.toContain('metrics.noData')
  })

  it('shows a no-data message instead of an empty chart when there are no area codes', () => {
    const noAreas = { ...counts, areaCodes: [] }
    const html = renderToStaticMarkup(<RegistryCharts counts={noAreas} />)
    expect(html).toContain('metrics.noData')
  })
})
