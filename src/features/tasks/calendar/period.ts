export type CalendarMode = 'month' | 'week'

// PostgreSQL DATE values stay as YYYY-MM-DD. Noon avoids local/UTC midnight shifts.
export const dateKey = (date: Date) => {
  const y = date.getFullYear()
  return `${y}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export const dateFromKey = (key: string) => new Date(`${key}T12:00:00`)
export const todayKey = () => dateKey(new Date())
export const addDays = (key: string, count: number) => {
  const date = dateFromKey(key)
  date.setDate(date.getDate() + count)
  return dateKey(date)
}
export const weekStart = (key: string) => addDays(key, -((dateFromKey(key).getDay() + 6) % 7))
export function period(key: string, mode: CalendarMode) {
  const first = mode === 'week' ? weekStart(key) : weekStart(`${key.slice(0, 7)}-01`)
  const monthLast = dateKey(new Date(dateFromKey(key).getFullYear(), dateFromKey(key).getMonth() + 1, 0, 12))
  const last = mode === 'week' ? addDays(first, 6) : addDays(weekStart(monthLast), 6)
  const days: string[] = []
  for (let day = first; day <= last; day = addDays(day, 1)) days.push(day)
  return { first, last, days }
}
export function movePeriod(key: string, mode: CalendarMode, step: number) {
  if (mode === 'week') return addDays(key, step * 7)
  const date = dateFromKey(key)
  return dateKey(new Date(date.getFullYear(), date.getMonth() + step, 1, 12))
}
