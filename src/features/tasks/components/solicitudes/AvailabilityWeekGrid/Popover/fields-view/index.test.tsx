import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'
import { END_OF_DAY_TIME } from '@/features/tasks/utils/availability/constants'
import {
  END_ERROR_TEXT,
  END_FIELD_ID,
  OFF_STEP_END_TIME,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/constants'
import renderFields from './index'

const noop = () => undefined
const START_ID = 'start-id'
const NOTE_ID = 'note-id'
const BASE_FIELD = { inputType: 'time' as const, value: '09:00', onChange: noop }
const START_FIELD: RangeFieldProps = { ...BASE_FIELD, id: START_ID, label: 'Start' }
const END_FIELD: RangeFieldProps = { ...BASE_FIELD, id: END_FIELD_ID, label: 'End' }
const NOTE_FIELD: RangeFieldProps = { ...BASE_FIELD, id: NOTE_ID, label: 'Note' }
const FIELDS = { startField: START_FIELD, endField: END_FIELD, noteField: NOTE_FIELD }

describe('renderFields', () => {
  it('renders all three fields', () => {
    const html = renderToStaticMarkup(<>{renderFields(FIELDS)}</>)
    const fieldIds = [START_ID, END_FIELD_ID, NOTE_ID]

    for (const id of fieldIds) {
      expect(html).toContain(id)
    }
  })

  it('offers midnight only in the end select while start stays a time input', () => {
    const html = renderToStaticMarkup(<>{renderFields(FIELDS)}</>)
    const controlMarkup = [
      `id="${START_ID}" type="time"`,
      `select id="${END_FIELD_ID}"`,
      `value="${END_OF_DAY_TIME}">${END_OF_DAY_TIME}`,
    ]

    for (const markup of controlMarkup) {
      expect(html).toContain(markup)
    }

    expect(html).not.toContain(`value="${END_OF_DAY_TIME}" selected=""`)
  })

  it('preserves an existing off-step end and selected midnight', () => {
    const offStep = { ...FIELDS, endField: { ...END_FIELD, value: OFF_STEP_END_TIME } }
    const midnight = { ...FIELDS, endField: { ...END_FIELD, value: END_OF_DAY_TIME } }
    const offStepHtml = renderToStaticMarkup(<>{renderFields(offStep)}</>)
    const midnightHtml = renderToStaticMarkup(<>{renderFields(midnight)}</>)

    expect(offStepHtml).toContain(`value="${OFF_STEP_END_TIME}" selected=""`)
    expect(midnightHtml).toContain(`value="${END_OF_DAY_TIME}" selected=""`)
  })

  it('links end errors and preserves the read-only disabled state', () => {
    const endField = { ...END_FIELD, disabled: true, error: END_ERROR_TEXT }
    const html = renderToStaticMarkup(<>{renderFields({ ...FIELDS, endField })}</>)
    const errorMarkup = [
      `id="${END_FIELD_ID}" disabled="" aria-invalid="true"`,
      `aria-describedby="${END_FIELD_ID}-error"`,
      `id="${END_FIELD_ID}-error" role="alert">${END_ERROR_TEXT}`,
    ]

    for (const attribute of errorMarkup) {
      expect(html).toContain(attribute)
    }
  })
})
