import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import RANGE_FIELD_CONSTANTS from './constants'
import type { RangeFieldProps } from './types'
import RangeField from './index'

const TIME_INPUT = 'time'
const TEXT_INPUT = 'text'
const LABEL = 'Start time'
const NOTE_LABEL = 'Note'
const VALUE = '09:00'
const NOTE_VALUE = 'Focus'
const ERROR = 'Start time must be before the end time'
const FIELD_ID = 'range-start'
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
  inputType: TEXT_INPUT,
  label: NOTE_LABEL,
  value: NOTE_VALUE,
  onChange: ignoreChange,
}

describe('RangeField', () => {
  it('associates the visible label with its native input', () => {
    const html = draw(timeProps)

    expect(html).toContain(`for="${FIELD_ID}"`)
    expect(html).toContain(`id="${FIELD_ID}"`)
    expect(html).toContain(LABEL)
  })

  it('links an error to the invalid input through an alert region', () => {
    const html = draw(errorProps)
    const errorId = html.match(/aria-describedby="([^"]+)"/)?.[1]

    expect(html).toContain('aria-invalid="true"')
    expect(errorId).toBeDefined()
    expect(html).toContain(`id="${errorId}" role="alert"`)
    expect(html).toContain(ERROR)
  })

  it('leaves error accessibility attributes off when there is no error', () => {
    const html = draw(timeProps)

    expect(html).not.toContain('aria-invalid')
    expect(html).not.toContain('aria-describedby')
  })

  it('uses the time step for time inputs', () => {
    const html = draw(timeProps)

    expect(html).toContain(`type="${TIME_INPUT}"`)
    expect(html).toContain(`step="${TIME_STEP}"`)
  })

  it('limits note text to the persisted column length', () => {
    const html = draw(noteProps)

    expect(html).toContain(`type="${TEXT_INPUT}"`)
    expect(html).toContain(`maxLength="${NOTE_MAX_LENGTH}"`)
  })
})
