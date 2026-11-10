import type { LocalEditorState } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'

/** The status/message half of the editor state, without `ranges` — what a stale save result
 *  lives in, and what clearStaleFeedback resets once the person edits a range again. */
export type SettledFeedback = Omit<LocalEditorState, 'ranges'>
