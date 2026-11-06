import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'
import EndTimeSelect from './index'

const noop = () => undefined
const END_ID = 'end-id'
const END_LABEL = 'End'
const END_ERROR = 'End must be after start'
const MIDNIGHT = '24:00'
const OFF_STEP = '17:15'
const PROPS: RangeFieldProps = {
  id: END_ID,
  inputType: 'time',
  label: END_LABEL,
  value: MIDNIGHT,
  onChange: noop,
}

describe('EndTimeSelect', () => {
  it('labels the select and selects the next-day midnight end', () => {
    const html = renderToStaticMarkup(<EndTimeSelect {...PROPS} />)

    expect(html).toContain(`for="${END_ID}"`)
    expect(html).toContain(`aria-label="${END_LABEL}"`)
    expect(html).toContain(`value="${MIDNIGHT}" selected=""`)
  })

  it('keeps an existing off-step end selectable', () => {
    const html = renderToStaticMarkup(<EndTimeSelect {...PROPS} value={OFF_STEP} />)

    expect(html).toContain(`value="${OFF_STEP}" selected=""`)
  })

  it('disables editing and links validation to the end field', () => {
    const html = renderToStaticMarkup(<EndTimeSelect {...PROPS} disabled error={END_ERROR} />)

    expect(html).toContain(`id="${END_ID}" disabled="" aria-invalid="true"`)
    expect(html).toContain(`aria-describedby="${END_ID}-error"`)
    expect(html).toContain(`id="${END_ID}-error" role="alert">${END_ERROR}`)
  })
})
