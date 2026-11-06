import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { END_OF_DAY_TIME } from '@/features/tasks/utils/availability/constants'
import renderEndOptions from './index'

const FIRST_CHOICE = '00:00'
const HALF_HOUR = '00:30'
const OFF_STEP_END = '17:15'
const END_OPTION_COUNT = 49
const SELECT_TAG = 'select'

describe('end-time choices', () => {
  it('offers every half hour through next-day midnight', () => {
    const options = renderEndOptions(FIRST_CHOICE)
    const html = renderToStaticMarkup(createElement(SELECT_TAG, undefined, options))

    expect(html).toContain(`value="${HALF_HOUR}"`)
    expect(html).toContain(`value="${END_OF_DAY_TIME}"`)
    expect(options).toHaveLength(END_OPTION_COUNT)
  })

  it('keeps an existing off-step end as a selectable option', () => {
    const options = renderEndOptions(OFF_STEP_END)
    const html = renderToStaticMarkup(createElement(SELECT_TAG, undefined, options))

    expect(html).toContain(`value="${OFF_STEP_END}"`)
  })
})
