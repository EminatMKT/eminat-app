import type { I18nKey, Vars } from '@/shared/i18n/types'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import { BLOCK_LABEL_KEY, BLOCK_LABEL_READ_ONLY_KEY } from '../constants'

type Translate = (key: I18nKey, vars?: Vars) => string

const NOTE_SEPARATOR = ', '
const EMPTY_NOTE = ''

/** The block's one accessible label: its time range, its note when present, and the editable-
 *  or read-only suffix i18n already carries — never built from raw Spanish strings in the DOM. */
export default function accessibleLabel(
  { startsAt, endsAt, note }: WeeklyAvailabilityRange,
  readOnly: boolean,
  translate: Translate,
): string {
  const time = `${startsAt}–${endsAt}`
  const noteText = note ? `${NOTE_SEPARATOR}${note}` : EMPTY_NOTE
  const key = readOnly ? BLOCK_LABEL_READ_ONLY_KEY : BLOCK_LABEL_KEY
  const vars = { time, note: noteText }

  return translate(key, vars)
}

// accessibleLabel is the one place a block's time, note, and edit mode become its ARIA text.
