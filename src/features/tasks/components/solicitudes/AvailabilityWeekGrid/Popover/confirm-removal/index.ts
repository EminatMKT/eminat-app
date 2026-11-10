import type { ConfirmationFunction } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/types'

const askForConfirmation: ConfirmationFunction = message => globalThis.confirm(message)

export default function confirmRemoval(
  message: string,
  remove: () => void,
  confirm: ConfirmationFunction = askForConfirmation,
): void {
  const confirmed = confirm(message)

  if (confirmed) remove()
}

// This helper runs a caller-supplied confirmation before invoking range removal.
