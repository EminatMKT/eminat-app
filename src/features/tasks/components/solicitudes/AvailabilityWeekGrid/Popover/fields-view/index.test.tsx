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

describe('renderFields', () => {
  it('renders all three fields', () => {
    const html = renderToStaticMarkup(<>{renderFields(FIELDS)}</>)

    expect(html).toContain(START_ID)
    expect(html).toContain(END_ID)
    expect(html).toContain(NOTE_ID)
  })
})
