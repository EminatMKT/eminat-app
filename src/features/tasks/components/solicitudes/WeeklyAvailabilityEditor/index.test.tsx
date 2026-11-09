import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { LocaleProvider } from '@/shared/i18n'
import type { ComponentProps } from 'react'
import AvailabilityWeekGrid from '../AvailabilityWeekGrid'
import WeeklyAvailabilityEditor from './index'

const NO_ONCHANGE = vi.fn()
const BANNER_MESSAGE = 'Hay 1 rango invalido'

const MONDAY_RANGE = {
  clientId: 'monday-1',
  weekday: 1 as const,
  startsAt: '09:00',
  endsAt: '13:00',
  note: null,
}

const gridProps: ComponentProps<typeof AvailabilityWeekGrid> = {
  ranges: [MONDAY_RANGE],
  workday: { id: 'workday-1', name: 'Full time', hoursPerDay: 8 },
  readOnly: false,
  onChange: NO_ONCHANGE,
}
const bannerProps: ComponentProps<typeof WeeklyAvailabilityEditor>['bannerProps'] = {
  message: BANNER_MESSAGE,
  focusRef: { current: null },
}

const draw = (props: ComponentProps<typeof WeeklyAvailabilityEditor>) => renderToStaticMarkup(
  <LocaleProvider><WeeklyAvailabilityEditor {...props} /></LocaleProvider>,
)

describe('WeeklyAvailabilityEditor', () => {
  it('forwards gridProps straight into the drag/resize grid', () => {
    const html = draw({ gridProps, bannerProps: null })

    expect(html).toContain(MONDAY_RANGE.startsAt)
  })

  it('shows the validation banner only when bannerProps is given', () => {
    const withBanner = draw({ gridProps, bannerProps })
    const withoutBanner = draw({ gridProps, bannerProps: null })

    expect(withBanner).toContain(BANNER_MESSAGE)
    expect(withoutBanner).not.toContain(BANNER_MESSAGE)
  })
})
