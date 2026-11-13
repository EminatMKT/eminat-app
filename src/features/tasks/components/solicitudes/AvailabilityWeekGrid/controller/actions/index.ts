import mutations from './mutations'
import creation from './creation'
import pointerCreate from './pointer-create'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import type { GridActionContext, GridActions } from './types'

function dialog(context: GridActionContext): Pick<GridActions, 'onOpen' | 'onClose'> {
  const onOpen = (range: EditableRange) => context.select(range.clientId)
  const onClose = () => context.select(null)

  return { onOpen, onClose }
}

/** Composes the grid's four action groups into the one object index.tsx wires onto its days
 *  and popover: mutations, the two create paths, and the dialog open/close pair. */
export default function createGridActions(context: GridActionContext): GridActions {
  const actions = {
    ...mutations(context),
    ...creation(context),
    ...pointerCreate(context),
    ...dialog(context),
  }

  return actions
}

// Each action group owns one concern; this file only composes them into the shape callers use.
