import {
  MEETING_MODALITY_OPTIONS,
  MEETING_TYPE_OPTIONS,
  type MeetingModality,
  type MeetingType,
  type MeetingUpdateInput,
} from '@/features/meet/lib/types'

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> }

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isRealCalendarDate(value: string): boolean {
  if (!datePattern.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function toMeetingUpdateInput(
  input: Record<string, unknown>
): ValidationResult<MeetingUpdateInput> {
  const errors: Record<string, string> = {}
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const meetingDate =
    typeof input.meeting_date === 'string' ? input.meeting_date : ''
  const modality = nullableString(input.modality)
  const meetingType = nullableString(input.meeting_type)
  const startTime = nullableString(input.start_time)
  const endTime = nullableString(input.end_time)

  if (!title) errors.title = 'El título es obligatorio.'
  if (!isRealCalendarDate(meetingDate)) {
    errors.meeting_date = 'La fecha no es válida.'
  }
  if (
    modality &&
    !MEETING_MODALITY_OPTIONS.includes(modality as MeetingModality)
  ) {
    errors.modality = 'La modalidad no es válida.'
  }
  if (
    meetingType &&
    !MEETING_TYPE_OPTIONS.includes(meetingType as MeetingType)
  ) {
    errors.meeting_type = 'El tipo de reunión no es válido.'
  }
  if (startTime && !timePattern.test(startTime)) {
    errors.start_time = 'La hora de inicio no es válida.'
  }
  if (endTime && !timePattern.test(endTime)) {
    errors.end_time = 'La hora de fin no es válida.'
  }
  if (startTime && endTime && startTime >= endTime) {
    errors.end_time = 'La hora de fin debe ser posterior a la de inicio.'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      title,
      objective: nullableString(input.objective),
      modality: modality as MeetingModality | null,
      location: nullableString(input.location),
      meeting_date: meetingDate,
      start_time: startTime,
      end_time: endTime,
      meeting_type: meetingType as MeetingType | null,
    },
  }
}
