import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import COMPOSITION_CONSTANTS from './constants'
import WeeklyAvailabilityEditorComposition from './index'

const DAY_CONTENT = createElement('span', null, 'day')
const WEEKLY_SUMMARY = createElement('p', null, 'weekly summary')
const ACTIONS = createElement('div', null, 'actions')

const baseProps = {
  monday: DAY_CONTENT,
  tuesday: DAY_CONTENT,
  wednesday: DAY_CONTENT,
  thursday: DAY_CONTENT,
  friday: DAY_CONTENT,
  saturday: DAY_CONTENT,
  sunday: DAY_CONTENT,
  weeklySummary: WEEKLY_SUMMARY,
  validationMessage: null,
  validationFocusRef: createRef<HTMLDivElement>(),
  actions: ACTIONS,
}

describe('WeeklyAvailabilityEditorComposition', () => {
  it('composes the seven day views, summary, and actions', () => {
    const html = renderToStaticMarkup(
      createElement(WeeklyAvailabilityEditorComposition, baseProps),
    )

    expect(html).toContain('weekly summary')
    expect(html).toContain('actions')
    expect(html.match(/day/g)).toHaveLength(7)
  })

  it('renders focusable assertive validation feedback when supplied', () => {
    const html = renderToStaticMarkup(
      createElement(WeeklyAvailabilityEditorComposition, {
        ...baseProps,
        validationMessage: 'Fix the time ranges before saving.',
      }),
    )

    expect(html).toContain(`id="${COMPOSITION_CONSTANTS.validationId}"`)
    expect(html).toContain(`role="${COMPOSITION_CONSTANTS.validationRole}"`)
    expect(html).toContain(`aria-live="${COMPOSITION_CONSTANTS.validationLive}"`)
    expect(html).toContain(`tabindex="${COMPOSITION_CONSTANTS.validationTabIndex}"`)
  })

  it('omits validation feedback when the message is null', () => {
    const html = renderToStaticMarkup(
      createElement(WeeklyAvailabilityEditorComposition, baseProps),
    )

    expect(html).not.toContain(`role="${COMPOSITION_CONSTANTS.validationRole}"`)
    expect(html).not.toContain(COMPOSITION_CONSTANTS.validationId)
  })
})
