import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NINE_AM } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/constants'
import {
  RANGE_START_FIELD_ID,
  START_BEFORE_END_ERROR,
} from '../test-fixtures/constants'
import { RANGE_FIELD_CONSTANTS } from './constants'
import type { RangeFieldProps } from './types'
import RangeField from './index'

const TIME_INPUT = 'time'
const TEXTAREA_INPUT = 'textarea'
const LABEL = 'Start time'
const NOTE_LABEL = 'Note'
const VALUE = NINE_AM
const NOTE_VALUE = 'Focus'
const ERROR = START_BEFORE_END_ERROR
const FIELD_ID = RANGE_START_FIELD_ID
const NOTE_ID = 'range-note'
const TIME_STEP = RANGE_FIELD_CONSTANTS.timeStep
const NOTE_MAX_LENGTH = RANGE_FIELD_CONSTANTS.noteMaxLength

const ignoreChange = () => undefined

const draw = (props: RangeFieldProps) => renderToStaticMarkup(<RangeField {...props} />)

const timeProps: RangeFieldProps = {
  id: FIELD_ID,
  inputType: TIME_INPUT,
  label: LABEL,
  value: VALUE,
  onChange: ignoreChange,
}

const errorProps: RangeFieldProps = {
  ...timeProps,
  error: ERROR,
}

const noteProps: RangeFieldProps = {
  id: NOTE_ID,
  inputType: TEXTAREA_INPUT,
  label: NOTE_LABEL,
  value: NOTE_VALUE,
  onChange: ignoreChange,
}

describe('RangeField', () => {
  it('associates the visible label with its native input', () => {
    const html = draw(timeProps)

    expect(html).toContain(`for="${FIELD_ID}"`)
    expect(html).toContain(`id="${FIELD_ID}"`)
    expect(html).toMatch(LABEL)
  })

  it('links an error to the invalid input through an alert region', () => {
    const html = draw(errorProps)
    const errorId = html.match(/aria-describedby="([^"]+)"/)?.[1]

    expect(html).toMatch(/aria-invalid="true"/)
    expect(errorId).toBeDefined()
    expect(html).toContain(`id="${errorId}" role="alert"`)
    expect(html).toContain(ERROR)
  })

  it('leaves error accessibility attributes off when there is no error', () => {
    const html = draw(timeProps)

    expect(html).not.toMatch(/aria-invalid/)
    expect(html).not.toMatch(/aria-describedby/)
  })

  it('uses the time step for time inputs', () => {
    const html = draw(timeProps)

    expect(html).toContain(`type="${TIME_INPUT}"`)
    expect(html).toContain(`step="${TIME_STEP}"`)
  })

  it('limits note text to the persisted column length', () => {
    const html = draw(noteProps)

    expect(html).toMatch(/<\/textarea>/)
    expect(html).toContain(`maxLength="${NOTE_MAX_LENGTH}"`)
  })

  it('links a counter to the input through the described-by region', () => {
    const counterText = '20 characters remaining'
    const html = draw({ ...noteProps, counterText, counterNearLimit: true })
    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1]

    expect(describedBy).toBeDefined()
    expect(html).toContain(counterText)
    expect(html).toMatch(/data-near-limit="true"/)
  })

  it('renders disabled when the field is read-only', () => {
    const html = draw({ ...timeProps, disabled: true })

    expect(html).toMatch(/disabled=""/)
  })

  it('renders no disabled attribute when the prop is omitted', () => {
    const html = draw(timeProps)

    expect(html).not.toMatch(/disabled/)
  })
})
