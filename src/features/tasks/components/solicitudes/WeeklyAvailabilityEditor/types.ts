import type { AvailabilityMemberDto, AvailabilityResponse } from '@/features/tasks/data/availability/types'
import type { I18nKey } from '@/shared/i18n'
import type { Vars } from '@/shared/i18n/types'
import type { Weekday, WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'

export type EditorProps = {
  member: AvailabilityMemberDto
  onCancel: () => void
  onSaved: (response: AvailabilityResponse) => void
}

export type EditorDay = {
  weekday: Weekday
  labelKey: I18nKey
}

export type RangeField = 'startsAt' | 'endsAt' | 'note'

export type ChangeRangeAction = {
  kind: 'change'
  rangeIndex: number
  field: RangeField
  value: string
}

export type AddRangeAction = {
  kind: 'add'
  weekday: Weekday
}

export type RemoveRangeAction = {
  kind: 'remove'
  rangeIndex: number
}

export type EditorAction = ChangeRangeAction | AddRangeAction | RemoveRangeAction

export type EditorStatus = 'idle' | 'saving' | 'saved' | 'error'

export type EditorState = {
  ranges: WeeklyAvailabilityRange[]
  status: EditorStatus
  message: string | null
}

export type LabelValues = {
  day?: string
  number?: number
}

export type Translator = (key: I18nKey, vars?: Vars) => string
