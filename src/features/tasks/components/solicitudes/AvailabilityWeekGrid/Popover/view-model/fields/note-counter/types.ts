import type { RangeFieldProps } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/types'

/** The note field's always-visible counter props: remaining count, flagged near the limit. */
export type NoteCounterProps = Pick<RangeFieldProps, 'counterText' | 'counterNearLimit'>
