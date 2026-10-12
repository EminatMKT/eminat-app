/** Normalize obsolete product names at render time, never in persisted history. */
export function meetingDisplayCopy(value: string) {
  return value.replaceAll('StratixCRM', 'LILLY').replaceAll('Stratix Meet', 'Meetings')
}
