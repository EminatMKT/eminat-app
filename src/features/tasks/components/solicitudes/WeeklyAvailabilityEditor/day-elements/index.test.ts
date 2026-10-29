import { isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/components/solicitudes/MemberAvailabilityCard/constants'
import type { EditorViewModel, EditorViewModelDay } from '../editor-view-model/types'
import buildDayElements from './index'
import type { DayElementsInput } from './types'

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

const buildEmptyDayModel = (dayIndex: number): EditorViewModelDay => ({
  day: AVAILABILITY_DAYS[dayIndex],
  ranges: [],
  errors: [],
  expectedHours: null,
})
const VIEW_MODEL: EditorViewModel = {
  monday: buildEmptyDayModel(0),
  tuesday: buildEmptyDayModel(1),
  wednesday: buildEmptyDayModel(2),
  thursday: buildEmptyDayModel(3),
  friday: buildEmptyDayModel(4),
  saturday: buildEmptyDayModel(5),
  sunday: buildEmptyDayModel(6),
  weeklySummary: { declaredHours: 0 },
}
const translate = vi.fn((key: string) => key)
const INPUT: DayElementsInput = {
  viewModel: VIEW_MODEL,
  translate,
  onChangeRange: vi.fn(),
  onAddRange: vi.fn(),
  onRemoveRange: vi.fn(),
}

describe('buildDayElements', () => {
  it('builds one valid element per named weekday', () => {
    const elements = buildDayElements(INPUT)

    expect(isValidElement(elements.monday)).toBe(true)
    expect(isValidElement(elements.sunday)).toBe(true)
    expect(Object.keys(elements)).toHaveLength(7)
  })

  it('translates each day label and renders it inside the section', () => {
    const elements = buildDayElements(INPUT)

    const html = renderToStaticMarkup(elements.monday)

    expect(translate).toHaveBeenCalledWith(AVAILABILITY_DAYS[0].labelKey)
    expect(html).toContain(AVAILABILITY_DAYS[0].labelKey)
  })
})

// Confirms the seven-day composition and the day-label translation; DaySection has its own unit.
