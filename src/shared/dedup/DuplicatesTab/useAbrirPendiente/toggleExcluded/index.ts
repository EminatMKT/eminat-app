/** The excluded ids after the reviewer clicks one checkbox row: a row whose ids are all excluded
 *  comes back, any other row ends up fully excluded. */
export default function toggleExcluded(current: string[], ids: string[]): string[] {
  const allExcluded = ids.every(id => current.includes(id))
  const next = allExcluded
    ? current.filter(id => !ids.includes(id))
    : [...current, ...ids.filter(id => !current.includes(id))]
  return next
}

// Flips a checkbox row's ids between excluded and kept, for `useAbrirPendiente`'s excludedIds.
