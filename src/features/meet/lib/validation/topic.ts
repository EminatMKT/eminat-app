import {
  MEETING_SECTIONS,
  type MeetingSection,
  type TopicEditorialUpdate,
} from '@/features/meet/lib/types'
import type { ValidationResult } from '@/features/meet/lib/validation/meeting'

const sections = new Set(MEETING_SECTIONS.map(({ key }) => key))

export function toTopicEditorialUpdate(
  input: Record<string, unknown>
): ValidationResult<TopicEditorialUpdate> {
  const errors: Record<string, string> = {}
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const description =
    typeof input.description === 'string' && input.description.trim()
      ? input.description.trim()
      : null
  const section = typeof input.section === 'string' ? input.section : ''
  const orderIndex = input.order_index

  if (!title) errors.title = 'El título es obligatorio.'
  if (!sections.has(section as MeetingSection)) {
    errors.section = 'La sección no es válida.'
  }
  if (!Number.isInteger(orderIndex) || (orderIndex as number) < 0) {
    errors.order_index = 'El orden debe ser un entero no negativo.'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      title,
      description,
      section: section as MeetingSection,
      order_index: orderIndex as number,
    },
  }
}
