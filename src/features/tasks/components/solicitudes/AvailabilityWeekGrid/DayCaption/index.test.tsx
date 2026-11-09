import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import { HOURS_STATUS_MARKER } from './constants'
import DayCaption from './index'

const { I18N_MODULE } = vi.hoisted(() => ({ I18N_MODULE: '@/shared/i18n' }))

vi.mock(I18N_MODULE, () => ({ useT: () => ({ t: (key: string) => key }) }))

const MONDAY = AVAILABILITY_DAYS[0]

const draw = () => renderToStaticMarkup(<DayCaption day={MONDAY} />)

describe('DayCaption', () => {
  it('renders the translated weekday label', () => {
    const html = draw()

    expect(html).toContain(MONDAY.labelKey)
  })

  it('judges no day on its own: a jornada is a weekly target, never a daily one', () => {
    const html = draw()

    expect(html).not.toContain(HOURS_STATUS_MARKER)
  })
})

// Defines DayCaption's visible contract: only the weekday label. Hours are compared once, for
// the whole week, on the member card; the keyboard add-range path lives on the day's track.
