import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RANGE_FIELD_CONSTANTS }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/constants'
import type { AvailabilityRangeItemFields } from '../types'
import AvailabilityRangeItemControls from './index'

const { timeInputType: TIME_INPUT, textareaInputType: TEXTAREA_INPUT } = RANGE_FIELD_CONSTANTS
const NOT_FOUND = -1
const ignoreChange = () => undefined

const START = {
  id: 'controls-start',
  inputType: TIME_INPUT,
  label: 'Opens',
  value: '07:15',
  onChange: ignoreChange,
}
const END = {
  ...START,
  id: 'controls-end',
  label: 'Closes',
  value: '07:45',
}
const NOTE = {
  ...START,
  id: 'controls-note',
  inputType: TEXTAREA_INPUT,
  label: 'Memo',
}
const FIELDS: AvailabilityRangeItemFields = {
  startField: START,
  endField: END,
  noteField: NOTE,
}

describe('AvailabilityRangeItemControls', () => {
  it('draws the start, end and note fields in reading order', () => {
    const html = renderToStaticMarkup(<AvailabilityRangeItemControls {...FIELDS} />)
    const startAt = html.indexOf(START.id)
    const endAt = html.indexOf(END.id)

    expect(startAt).toBeGreaterThan(NOT_FOUND)
    expect(endAt).toBeGreaterThan(startAt)
    expect(html.indexOf(NOTE.id)).toBeGreaterThan(endAt)
  })

  it('labels the note field with its own visible label', () => {
    const html = renderToStaticMarkup(<AvailabilityRangeItemControls {...FIELDS} />)

    expect(html).toContain(NOTE.label)
  })
})
