import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MedicalDuplicatesTab from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

describe('MedicalDuplicatesTab', () => {
  it('shows the empty state before any pair has loaded', () => {
    const html = renderToStaticMarkup(<MedicalDuplicatesTab />)
    expect(html).toContain('dedup.emptyState')
  })
})
