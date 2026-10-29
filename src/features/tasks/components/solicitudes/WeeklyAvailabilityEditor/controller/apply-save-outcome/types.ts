import type { EditorStatus } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'

/** The status/message feedback a resolved save outcome produces, and whether validation focus
 *  should move. Deliberately excludes `ranges`/`pendingRemoval`: those come from the LIVE editor
 *  state at apply time, never from the outcome's pre-save snapshot — see `save-cycle`. */
export type ApplySaveOutcomeResult = {
  status: EditorStatus
  message: string | null
  shouldBumpFocusToken: boolean
}
