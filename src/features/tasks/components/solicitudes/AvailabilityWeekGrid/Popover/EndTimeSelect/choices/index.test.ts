import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { END_OF_DAY_TIME } from '@/features/tasks/utils/availability/constants'
import { DAY_START_TIME } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import { OFF_STEP_END_TIME } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/constants'
import renderEndOptions from './index'

const HALF_HOUR = '00:30'
const END_OPTION_COUNT = 49

describe('end-time choices', () => {
  it('offers every half hour through next-day midnight', () => {
    const options = renderEndOptions(DAY_START_TIME)
    const html = renderToStaticMarkup(createElement(Fragment, undefined, options))

    expect(html).toContain(`value="${HALF_HOUR}"`)
    expect(html).toContain(`value="${END_OF_DAY_TIME}"`)
    expect(options).toHaveLength(END_OPTION_COUNT)
  })

  it('keeps an existing off-step end as a selectable option', () => {
    const options = renderEndOptions(OFF_STEP_END_TIME)
    const html = renderToStaticMarkup(createElement(Fragment, undefined, options))

    expect(html).toContain(`value="${OFF_STEP_END_TIME}"`)
  })
})
