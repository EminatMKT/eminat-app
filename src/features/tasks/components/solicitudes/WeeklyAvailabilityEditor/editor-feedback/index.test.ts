import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import EDITOR_COPY from '../constants'
import buildEditorFeedback from './index'
import type { EditorFeedbackInput } from './types'

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const DECLARED_HOURS = 8
const translate = vi.fn((key: string) => key)
const BASE_INPUT: EditorFeedbackInput = {
  translate,
  declaredHours: DECLARED_HOURS,
  hasValidationErrors: false,
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

  it('reports the validation error copy when there are validation errors', () => {
    const feedback = buildEditorFeedback({ ...BASE_INPUT, hasValidationErrors: true })

    expect(feedback.validationMessage).toBe(EDITOR_COPY.validationError)
  })

  it('renders the shared cancel and save actions', () => {
    const feedback = buildEditorFeedback(BASE_INPUT)

    const html = renderToStaticMarkup(feedback.actions)

    expect(html).toContain(EDITOR_COPY.cancel)
    expect(html).toContain(EDITOR_COPY.save)
  })
})

// Verifies the summary/validation/actions composition; EditorActions has its own rendering unit.
