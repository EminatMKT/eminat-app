type Input = { dueDate: string; today: string; isPaid: boolean }

/** Precondition: both dates are validated full ISO date-only strings (`YYYY-MM-DD`),
 * which is what makes this lexicographic comparison a calendar one; Task 5's schema
 * enforces that shape, and the caller resolves `today` in America/Guayaquil. */
export default function reminderGroup({ dueDate, today, isPaid }: Input) {
  if (isPaid) return null
  return dueDate < today ? 'overdue' : 'upcoming'
}

// Classifies a billing record into its reminder bucket. Only payment records reach
// it — events and month notes are never reminders — and a paid payment is no
// reminder either, yet still shows in the calendar, hence null instead of dropping.
