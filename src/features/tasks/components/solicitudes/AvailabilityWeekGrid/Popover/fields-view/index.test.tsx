import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'
import renderFields from './index'

const noop = () => undefined
const START_ID = 'start-id'
const END_ID = 'end-id'
const NOTE_ID = 'note-id'
const BASE_FIELD = { inputType: 'time' as const, value: '09:00', onChange: noop }
const START_FIELD: RangeFieldProps = { ...BASE_FIELD, id: START_ID, label: 'Start' }
const END_FIELD: RangeFieldProps = { ...BASE_FIELD, id: END_ID, label: 'End' }
const NOTE_FIELD: RangeFieldProps = { ...BASE_FIELD, id: NOTE_ID, label: 'Note' }
const FIELDS = { startField: START_FIELD, endField: END_FIELD, noteField: NOTE_FIELD }
const MIDNIGHT_END = '24:00'
const OFF_STEP_END = '17:15'
const RANGE_ERROR = 'End must be after start'

describe('renderFields', () => {
  it('renders all three fields', () => {
    const html = renderToStaticMarkup(<>{renderFields(FIELDS)}</>)

    expect(html).toContain(START_ID)
    expect(html).toContain(END_ID)
    expect(html).toContain(NOTE_ID)
  })

  it('offers midnight only in the end select while start stays a time input', () => {
    const html = renderToStaticMarkup(<>{renderFields(FIELDS)}</>)

    expect(html).toContain(`id="${START_ID}" type="time"`)
    expect(html).toContain(`select id="${END_ID}"`)
    expect(html).toContain(`value="${MIDNIGHT_END}">${MIDNIGHT_END}`)
    expect(html).not.toContain(`value="${MIDNIGHT_END}" selected=""`)
  })

  it('preserves an existing off-step end and selected midnight', () => {
    const offStep = { ...FIELDS, endField: { ...END_FIELD, value: OFF_STEP_END } }
    const midnight = { ...FIELDS, endField: { ...END_FIELD, value: MIDNIGHT_END } }
    const offStepHtml = renderToStaticMarkup(<>{renderFields(offStep)}</>)
    const midnightHtml = renderToStaticMarkup(<>{renderFields(midnight)}</>)

    expect(offStepHtml).toContain(`value="${OFF_STEP_END}" selected=""`)
    expect(midnightHtml).toContain(`value="${MIDNIGHT_END}" selected=""`)
  })

  it('links end errors and preserves the read-only disabled state', () => {
    const endField = { ...END_FIELD, disabled: true, error: RANGE_ERROR }
    const html = renderToStaticMarkup(<>{renderFields({ ...FIELDS, endField })}</>)

    expect(html).toContain(`id="${END_ID}" disabled="" aria-invalid="true"`)
    expect(html).toContain(`aria-describedby="${END_ID}-error"`)
    expect(html).toContain(`id="${END_ID}-error" role="alert">${RANGE_ERROR}`)
  })
})
