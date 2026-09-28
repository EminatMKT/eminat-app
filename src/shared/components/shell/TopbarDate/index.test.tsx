import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { longDay, shortMoment } from '@/shared/utils'
import TopbarDate from './index'

const READER_LOCALE = 'es-EC'
const CLOCK = '09:05:00 a. m.'
// The frozen clock, a morning: what the context's clock would say is CLOCK.
const NOW = new Date(2026, 1, 3, 9, 5, 0)

vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ horaActual: CLOCK }) }))
vi.mock('@/shared/i18n', () => ({
  useT: () => ({ intlLocale: READER_LOCALE, t: (key: string, vars: Record<string, string>) => `${key}:${Object.values(vars).join('|')}` }),
}))

beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
afterAll(() => { vi.useRealTimers() })

describe('TopbarDate', () => {
  // The wide form is what the topbar always said: the whole day, then the ticking clock.
  it('says the whole day and the clock for a wide screen', () => {
    const html = renderToStaticMarkup(<TopbarDate />)
    expect(html).toContain(longDay(NOW, READER_LOCALE))
    expect(html).toContain(CLOCK)
  })

  // The phone form comes after the wide one, in the reader's language too.
  it('adds the short moment for a phone', () => {
    const html = renderToStaticMarkup(<TopbarDate />)
    const short = shortMoment(NOW, READER_LOCALE)
    expect(html).toContain(short)
    expect(html.indexOf(CLOCK)).toBeLessThan(html.indexOf(short))
  })
})
