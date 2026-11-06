import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { LocaleProvider, translate } from '@/shared/i18n'
import type {
  AvailabilityMemberDto,
  AvailabilityRangeDto,
} from '@/features/tasks/data/availability/types'
import EDITOR_COPY from './constants'
import { VALIDATION_SUMMARY_KEY } from './editor-feedback/constants'
import WeeklyAvailabilityEditor from './index'

const DEFAULT_LOCALE = 'es'
const RESIZE_HANDLE_MARKER = /data-resize-handle="true"/g
const SINGLE_INVALID_RANGE_COUNT = 1
const NO_ONSAVED = vi.fn()
const NO_ONCANCEL = vi.fn()

const MONDAY_RANGE: AvailabilityRangeDto = {
  id: 'monday-1',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '13:00',
  note: null,
}
const OVERLAPPING_RANGE: AvailabilityRangeDto = {
  id: 'monday-2',
  weekday: 1,
  startsAt: '12:00',
  endsAt: '14:00',
  note: null,
}
const member: AvailabilityMemberDto = {
  id: 'member-1',
  name: 'Ana López',
  team: null,
  workday: { id: 'workday-1', name: 'Full time', hoursPerDay: 8 },
  ranges: [MONDAY_RANGE],
  canEdit: true,
}

type DrawInput = {
  value: AvailabilityMemberDto
  readOnly: boolean
}

const draw = (input: DrawInput) => renderToStaticMarkup(
  <LocaleProvider>
    <WeeklyAvailabilityEditor
      member={input.value}
      onCancel={NO_ONCANCEL}
      onSaved={NO_ONSAVED}
      readOnly={input.readOnly}
    />
  </LocaleProvider>,
)

describe('WeeklyAvailabilityEditor', () => {
  it('mounts the editable drag/resize grid with a save/cancel bar', () => {
    const html = draw({ value: member, readOnly: false })

    expect(html).toContain(MONDAY_RANGE.startsAt)
    expect(html).toContain(translate(DEFAULT_LOCALE, EDITOR_COPY.save))
    expect(html.match(RESIZE_HANDLE_MARKER)).not.toBeNull()
  })

  it('shows the validation banner with an invalid-range count when editable ranges overlap', () => {
    const overlapMember: AvailabilityMemberDto = {
      ...member,
      ranges: [MONDAY_RANGE, OVERLAPPING_RANGE],
    }
    const bannerVars = { count: SINGLE_INVALID_RANGE_COUNT }
    const bannerText = translate(DEFAULT_LOCALE, VALIDATION_SUMMARY_KEY, bannerVars)
    const html = draw({ value: overlapMember, readOnly: false })

    expect(html).toContain(bannerText)
  })

  it('renders only the grid in read-only mode: no save/cancel bar, no validation banner', () => {
    const overlapMember: AvailabilityMemberDto = {
      ...member,
      ranges: [MONDAY_RANGE, OVERLAPPING_RANGE],
    }
    const bannerVars = { count: SINGLE_INVALID_RANGE_COUNT }
    const bannerText = translate(DEFAULT_LOCALE, VALIDATION_SUMMARY_KEY, bannerVars)
    const html = draw({ value: overlapMember, readOnly: true })

    expect(html).not.toContain(translate(DEFAULT_LOCALE, EDITOR_COPY.save))
    expect(html).not.toContain(translate(DEFAULT_LOCALE, EDITOR_COPY.cancel))
    expect(html).not.toContain(bannerText)
    expect(html.match(RESIZE_HANDLE_MARKER)).toBeNull()
  })

  it('keeps saved information scoped to ranges rather than a user id', () => {
    const html = draw({ value: member, readOnly: false })

    expect(html).not.toContain(member.id)
    expect(html).toContain(MONDAY_RANGE.startsAt)
  })
})
