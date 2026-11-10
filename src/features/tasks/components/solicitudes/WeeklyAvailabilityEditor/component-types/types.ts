import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { EditorStatus, RangeField } from '../types'
import type { I18nKey } from '@/shared/i18n'

export type EditableRange = WeeklyAvailabilityRange & {
  clientId: string
}

export type RangeChangeHandler = (clientId: string, field: RangeField, value: string) => void

export type RangeActionHandler = (clientId: string) => void

/** What `AvailabilityWeekGrid`'s `onChange` hands back once a create/resize/edit/delete gesture
 *  has already resolved internally: the whole week's committed ranges. */
export type RangeListChangeHandler = (ranges: EditableRange[]) => void

export type LocalEditorState = {
  ranges: EditableRange[]
  status: EditorStatus
  message: I18nKey | null
  pendingRemoval: EditableRange | null
}
