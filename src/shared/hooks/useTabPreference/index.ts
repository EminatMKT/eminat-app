import { useUserPreference } from '../useUserPreference'
import { oneOf } from '../usePersistedState'

/** Which tab of a module is open, remembered per user (`tab-<module>`), narrowed to a closed set. */
export default function useTabPreference<T extends string>(module: string, initial: T, values: readonly T[]) {
  return useUserPreference<T>(`tab-${module}`, initial, oneOf(...values))
}

// The one line every module-tab switcher repeats (Admin, Accounting, and now Billing): a
// `useUserPreference` scoped to `tab-<module>` and narrowed with `oneOf`. Named once here.
