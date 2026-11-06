import { commitRange } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/range-operations'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { PopoverSaveHandler, PopoverRemoveHandler } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/types'
import type { GridActionContext } from '../types'

function canEdit(context: GridActionContext, clientId: string) {
  return !context.readOnly && context.ranges.some(range => range.clientId === clientId)
}

function finish(context: GridActionContext, ranges: EditableRange[]) {
  const valid = commitRange(ranges)

  if (!valid) return
  context.onChange(valid)
  context.select(null)
}

function saving(context: GridActionContext): PopoverSaveHandler {
  return (clientId, draft) => {
    if (!canEdit(context, clientId)) return
    const next = context.ranges.map(range => range.clientId === clientId
      ? { ...range, ...draft } : range)

    finish(context, next)
  }
}

function removing(context: GridActionContext): PopoverRemoveHandler {
  return clientId => {
    if (!canEdit(context, clientId)) return
    const next = context.ranges.filter(range => range.clientId !== clientId)

    finish(context, next)
  }
}

export default function mutations(context: GridActionContext) {
  const handlers = { onSave: saving(context), onRemove: removing(context) }

  return handlers
}

// Existing identities and the complete week are rechecked before dialog mutations propagate.
