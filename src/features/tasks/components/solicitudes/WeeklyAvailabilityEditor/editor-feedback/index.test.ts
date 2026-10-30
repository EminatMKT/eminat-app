import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import EDITOR_COPY from '../constants'
import { VALIDATION_SUMMARY_KEY } from './constants'
import buildEditorFeedback from './index'
import type { EditorFeedbackInput } from './types'

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const DECLARED_HOURS = 8
const FIRST_RANGE_INDEX = 0
const SECOND_RANGE_INDEX = 1
const SINGLE_INVALID_RANGE_COUNT = 1
const NO_ERRORS: RangeValidationError[] = []
const translate = vi.fn((key: string) => key)
const BASE_INPUT: EditorFeedbackInput = {
  translate,
  declaredHours: DECLARED_HOURS,
  errors: NO_ERRORS,
  status: EDITOR_COPY.idleStatus,
  message: null,
  onCancel: vi.fn(),
  onSave: vi.fn(),
}

describe('buildEditorFeedback', () => {
  it('translates the weekly summary with the declared hours', () => {
    const feedback = buildEditorFeedback(BASE_INPUT)

    expect(translate).toHaveBeenCalledWith(EDITOR_COPY.weeklyHoursKey, { hours: DECLARED_HOURS })
    expect(renderToStaticMarkup(feedback.weeklySummary)).toContain(EDITOR_COPY.weeklyHoursKey)
  })

  it('reports no validation message when there are no validation errors', () => {
    const feedback = buildEditorFeedback(BASE_INPUT)

    expect(feedback.validationMessage).toBeNull()
  })

  it('reports a count summary, not the per-range sentence, when ranges are invalid', () => {
    const errors: RangeValidationError[] = [
      { code: 'end-not-after-start', rangeIndex: FIRST_RANGE_INDEX },
    ]

    const feedback = buildEditorFeedback({ ...BASE_INPUT, errors })

    expect(feedback.validationMessage).toBe(VALIDATION_SUMMARY_KEY)
    expect(translate).toHaveBeenCalledWith(
      VALIDATION_SUMMARY_KEY,
      { count: SINGLE_INVALID_RANGE_COUNT },
    )
  })

  it('counts distinct ranges once even when one range carries two errors', () => {
    const errors: RangeValidationError[] = [
      { code: 'end-not-after-start', rangeIndex: FIRST_RANGE_INDEX },
      {
        code: 'overlap',
        rangeIndex: FIRST_RANGE_INDEX,
        conflictingRangeIndex: SECOND_RANGE_INDEX,
      },
    ]

    buildEditorFeedback({ ...BASE_INPUT, errors })

    expect(translate).toHaveBeenCalledWith(
      VALIDATION_SUMMARY_KEY,
      { count: SINGLE_INVALID_RANGE_COUNT },
    )
  })

  it('renders the shared cancel and save actions', () => {
    const feedback = buildEditorFeedback(BASE_INPUT)

    const html = renderToStaticMarkup(feedback.actions)

    expect(html).toContain(EDITOR_COPY.cancel)
    expect(html).toContain(EDITOR_COPY.save)
  })
})

// Verifies the summary/validation/actions composition; EditorActions has its own rendering unit.
