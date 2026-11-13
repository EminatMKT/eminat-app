import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'
import { END_OF_DAY_TIME } from '@/features/tasks/utils/availability/constants'
import {
  END_ERROR_TEXT,
  END_FIELD_ID,
  OFF_STEP_END_TIME,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/constants'
import EndTimeSelect from './index'

const noop = () => undefined
const END_LABEL = 'End'
const PROPS: RangeFieldProps = {
  id: END_FIELD_ID,
  inputType: 'time',
  label: END_LABEL,
  value: END_OF_DAY_TIME,
  onChange: noop,
}

describe('EndTimeSelect', () => {
  it('labels the select and selects the next-day midnight end', () => {
    const html = renderToStaticMarkup(<EndTimeSelect {...PROPS} />)
    const expectedMarkup = [
      `for="${END_FIELD_ID}"`,
      `aria-label="${END_LABEL}"`,
      `value="${END_OF_DAY_TIME}" selected=""`,
    ]

    for (const markup of expectedMarkup) {
      expect(html).toContain(markup)
    }
  })

  it('keeps an existing off-step end selectable', () => {
    const html = renderToStaticMarkup(<EndTimeSelect {...PROPS} value={OFF_STEP_END_TIME} />)

    expect(html).toContain(`value="${OFF_STEP_END_TIME}" selected=""`)
  })

  it('disables editing and links validation to the end field', () => {
    const html = renderToStaticMarkup(<EndTimeSelect {...PROPS} disabled error={END_ERROR_TEXT} />)
    const validationMarkup = [
      `id="${END_FIELD_ID}" disabled="" aria-invalid="true"`,
      `aria-describedby="${END_FIELD_ID}-error"`,
      `id="${END_FIELD_ID}-error" role="alert">${END_ERROR_TEXT}`,
    ]

    for (const attribute of validationMarkup) {
      expect(html).toContain(attribute)
    }
  })
})
