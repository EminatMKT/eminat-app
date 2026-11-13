import type { Dispatch, SetStateAction } from 'react'
import type { AvailabilityResponse } from '@/features/tasks/data/availability/types'
import type {
  LocalEditorState,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import type { ControllerState } from '../save-cycle/types'

/** Everything one save attempt needs: the live editor snapshot to persist, the caller's success
 *  callback, and the setter that carries the resulting controller state. */
export type PerformSaveInput = {
  editor: LocalEditorState
  onSaved: (response: AvailabilityResponse) => void
  setControllerState: Dispatch<SetStateAction<ControllerState>>
}
